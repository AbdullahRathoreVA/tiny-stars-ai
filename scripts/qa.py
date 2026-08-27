"""
Build-output QA for the Tiny Stars preview.

Runs against dist/ after `npm run build`. Checks the things that silently rot:
broken internal links, missing alt text, heading order, page weight, duplicate or
missing metadata, and any secret that should never have been committed.

Usage:  python scripts/qa.py
"""

import io
import json
import os
import re
import sys
from collections import defaultdict

DIST = "dist"
SEP = os.sep


def norm(p: str) -> str:
    return p.replace(SEP, "/")


def collect():
    pages, assets, html_files = set(), set(), []
    for root, _dirs, files in os.walk(DIST):
        for f in files:
            full = os.path.join(root, f)
            rel = "/" + norm(os.path.relpath(full, DIST))
            assets.add(rel)
            if f == "index.html":
                p = rel[: -len("index.html")].rstrip("/")
                pages.add(p if p else "/")
            if f.endswith(".html"):
                html_files.append(full)
    return pages, assets, html_files


def check_links(pages, assets, html_files):
    refs = defaultdict(set)
    for path in html_files:
        src = "/" + norm(os.path.relpath(path, DIST))
        html = io.open(path, encoding="utf-8", errors="ignore").read()
        for m in re.finditer(r'(?:href|src)="([^"]+)"', html):
            u = m.group(1)
            if u.startswith(
                ("http://", "https://", "mailto:", "tel:", "#", "data:", "javascript:")
            ):
                continue
            u = u.split("#")[0].split("?")[0]
            if u:
                refs[u].add(src)

    known_endpoints = {"/sitemap.xml", "/robots.txt", "/favicon.svg"}
    broken = []
    for u, srcs in sorted(refs.items()):
        candidate = u.rstrip("/") or "/"
        ok = (
            candidate in pages
            or u in assets
            or u.rstrip("/") + "/index.html" in assets
            or u in known_endpoints
        )
        if not ok:
            broken.append((u, sorted(srcs)[:3]))
    return len(refs), broken


IMG_RE = re.compile(r"<img\b[^>]*>", re.I)
ALT_RE = re.compile(r'\balt="([^"]*)"', re.I)


def check_a11y_and_seo(html_files):
    problems = []
    for path in html_files:
        page = "/" + norm(os.path.relpath(path, DIST))
        html = io.open(path, encoding="utf-8", errors="ignore").read()

        # Images without an alt attribute at all (alt="" is valid for decorative).
        for tag in IMG_RE.findall(html):
            if not ALT_RE.search(tag):
                problems.append((page, "img missing alt attribute", tag[:90]))

        # Exactly one H1.
        h1s = re.findall(r"<h1\b", html, re.I)
        if len(h1s) != 1:
            problems.append((page, f"expected 1 h1, found {len(h1s)}", ""))

        # Title and description present and sane.
        title = re.search(r"<title>(.*?)</title>", html, re.S)
        if not title or not title.group(1).strip():
            problems.append((page, "missing <title>", ""))
        elif len(title.group(1)) > 65:
            problems.append((page, f"title {len(title.group(1))} chars (>65)", title.group(1)[:70]))

        desc = re.search(r'<meta name="description" content="([^"]*)"', html)
        if not desc or not desc.group(1).strip():
            problems.append((page, "missing meta description", ""))
        elif not (70 <= len(desc.group(1)) <= 175):
            problems.append((page, f"description {len(desc.group(1))} chars (want 70-175)", ""))

        if '<link rel="canonical"' not in html:
            problems.append((page, "missing canonical", ""))

        # Structured data must parse.
        for m in re.finditer(
            r'<script type="application/ld\+json">(.*?)</script>', html, re.S
        ):
            try:
                json.loads(m.group(1))
            except Exception as e:  # noqa: BLE001
                problems.append((page, f"invalid JSON-LD: {e}", ""))

        # Anything claiming a price, rating or opening hours must not appear as a
        # schema PROPERTY. Checked against parsed keys, not the raw string, so the
        # word "review" inside an answer's text is not a false positive.
        for m in re.finditer(
            r'<script type="application/ld\+json">(.*?)</script>', html, re.S
        ):
            try:
                data = json.loads(m.group(1))
            except Exception:  # noqa: BLE001
                continue
            for key in walk_keys(data):
                if key in BANNED_SCHEMA_KEYS:
                    problems.append((page, f"unverifiable schema property: {key}", ""))
    return problems


BANNED_SCHEMA_KEYS = {
    "priceRange",
    "aggregateRating",
    "openingHours",
    "openingHoursSpecification",
    "review",
    "numberOfEmployees",
    "offers",
}


def walk_keys(node):
    """Yield every object key in a nested JSON-LD structure."""
    if isinstance(node, dict):
        for k, v in node.items():
            yield k
            yield from walk_keys(v)
    elif isinstance(node, list):
        for item in node:
            yield from walk_keys(item)


SECRET_PATTERNS = [
    (r"sk-[A-Za-z0-9]{20,}", "OpenAI-style key"),
    (r"sk-ant-[A-Za-z0-9_\-]{20,}", "Anthropic key"),
    (r"AIza[0-9A-Za-z_\-]{30,}", "Google API key"),
    (r"ghp_[A-Za-z0-9]{30,}", "GitHub token"),
    (r"github_pat_[A-Za-z0-9_]{20,}", "GitHub fine-grained token"),
    (r"AKIA[0-9A-Z]{16}", "AWS access key"),
    (r"-----BEGIN [A-Z ]*PRIVATE KEY-----", "private key"),
    (r'(?i)\b(api[_-]?key|secret|passwd|password|token)\s*[:=]\s*["\'][^"\']{12,}["\']', "hardcoded credential"),
]

SKIP_DIRS = {"node_modules", ".git", "dist", ".astro"}


def scan_secrets(root="."):
    hits = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for f in filenames:
            if not f.endswith(
                (".ts", ".js", ".mjs", ".astro", ".json", ".md", ".css", ".html", ".txt", ".yml", ".yaml")
            ):
                continue
            path = os.path.join(dirpath, f)
            try:
                text = io.open(path, encoding="utf-8", errors="ignore").read()
            except OSError:
                continue
            for pattern, label in SECRET_PATTERNS:
                for m in re.finditer(pattern, text):
                    hits.append((norm(os.path.relpath(path, root)), label, m.group(0)[:28]))
    return hits


def page_weights(html_files):
    weights = []
    for path in html_files:
        page = "/" + norm(os.path.relpath(path, DIST))
        weights.append((os.path.getsize(path), page))
    weights.sort(reverse=True)
    return weights


def dir_size(path):
    total = 0
    for root, _d, files in os.walk(path):
        for f in files:
            total += os.path.getsize(os.path.join(root, f))
    return total


def main():
    if not os.path.isdir(DIST):
        print("dist/ not found — run `npm run build` first.")
        return 1

    pages, assets, html_files = collect()

    print("=" * 66)
    print(f"PAGES BUILT: {len(pages)}")

    total_refs, broken = check_links(pages, assets, html_files)
    print(f"INTERNAL LINKS: {total_refs} unique | BROKEN: {len(broken)}")
    for u, srcs in broken:
        print(f"   x {u}   <- {', '.join(srcs)}")

    problems = check_a11y_and_seo(html_files)
    print(f"\nA11Y / SEO ISSUES: {len(problems)}")
    grouped = defaultdict(list)
    for page, issue, detail in problems:
        grouped[issue].append((page, detail))
    for issue, items in sorted(grouped.items(), key=lambda kv: -len(kv[1])):
        print(f"   x {issue}  ({len(items)})")
        for page, detail in items[:4]:
            print(f"       {page} {detail}")

    secrets = scan_secrets(".")
    print(f"\nSECRET SCAN: {len(secrets)} hit(s)")
    for path, label, sample in secrets:
        print(f"   x {path}: {label} -> {sample}")

    print("\nHEAVIEST PAGES (html only):")
    for size, page in page_weights(html_files)[:6]:
        print(f"   {size / 1024:7.1f} KB  {page}")

    js = os.path.join(DIST, "_astro")
    if os.path.isdir(js):
        js_files = [
            (os.path.getsize(os.path.join(js, f)), f)
            for f in os.listdir(js)
            if f.endswith(".js")
        ]
        js_total = sum(s for s, _ in js_files)
        css_total = sum(
            os.path.getsize(os.path.join(js, f)) for f in os.listdir(js) if f.endswith(".css")
        )
        print(f"\nJS SHIPPED: {js_total / 1024:.1f} KB across {len(js_files)} chunk(s)")
        for size, f in sorted(js_files, reverse=True)[:5]:
            print(f"   {size / 1024:7.1f} KB  {f}")
        print(f"CSS SHIPPED: {css_total / 1024:.1f} KB")

    print(f"\nTOTAL dist/: {dir_size(DIST) / 1024 / 1024:.1f} MB")
    print("=" * 66)

    return 1 if (broken or secrets) else 0


if __name__ == "__main__":
    sys.exit(main())
