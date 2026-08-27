# Tiny Stars 2.0 — preview build

A redesign prototype of [tinystars.ca](https://tinystars.ca), a family-owned daycare in
Grande Prairie, Alberta.

**This is not the live site.** Every page ships `noindex`, `robots.txt` disallows
everything, and no form submits anywhere. The production site is untouched.

---

## Run it

```bash
npm install
npm run dev        # http://localhost:4321
```

```bash
npm run build      # static output in dist/
npm run preview    # serve the build
python scripts/qa.py   # link, SEO, a11y and secret audit against dist/
```

Node 20+. One runtime dependency: `astro`.

---

## The rule this build follows

A childcare website is an unusually bad place to be approximately right. A parent reading
it is deciding whether to hand over their child, so a plausible-sounding invented fee,
ratio or vacancy is worse than no answer at all.

Every factual claim on this site is therefore one of exactly three things:

| Label | Meaning | Where it comes from |
| --- | --- | --- |
| **Published** | Tiny Stars said it | tinystars.ca or one of its four published PDFs, with the source shown |
| **General guidance** | We wrote it | General early-childhood context, labelled as such, never presented as centre policy |
| **Ask the team** | Nobody has published it | The answer is a handoff to a person, not a guess |

There is no fourth category. Fees, availability, ratios, opening time, menus, staff
credentials and the licence number appear nowhere — not in the copy, not in the schema
markup, and not in anything the concierge will say.

Verified facts live in [`src/data/site.ts`](src/data/site.ts) with a `VERIFIED_ON` date and
an explicit `unverified` list. The knowledge base in
[`src/data/knowledge.ts`](src/data/knowledge.ts) carries a `trust` level and a `source` on
every entry.

---

## What's here

**31 pages.** Home, five program pages plus an index, Why Tiny Stars, Trust Centre,
questions-to-ask, a day at the centre, learning journey, gallery, virtual tour, Family Hub,
documents, FAQ, five enrolment routes, careers, contact, accessibility, privacy, 404 — plus
two demo-only surfaces.

**Interactive, and actually working:**

- **Program finder** — three questions, maps age to the published program ranges
- **Book a tour** — six-step flow with validation, review and draft recovery
- **Registration / waitlist** — same flow engine, different questions
- **Tour checklist** — 23 items, saved to your device, printable
- **Gallery** — filtering, lightbox, keyboard and swipe navigation
- **Global search** — BM25 + typo tolerance over 60+ documents, `Cmd/Ctrl+K`
- **Star Guide** — the concierge (below)
- **Parent Portal** (`/parent`) — synthetic data, clearly labelled
- **Agent Command Centre** (`/command-center`) — the architecture, and real session metrics

---

## Star Guide

The concierge runs **entirely in the browser**. No model, no API key, no network call.

```
message
  → guardrails      strip injection, redact PII, refuse out-of-scope
  → intent router   score against agent triggers + parsed child age
  → agent           one of 8 live specialists, each scoped to part of the KB
  → retrieval       BM25 over the knowledge base
  → guardrails      block any unsourced fee / ratio / availability / booking claim
  → response        text + trust label + source + actions + human handoff
```

It cannot hallucinate by construction: it only ever returns knowledge-base text. That is a
defensible production choice for a childcare site, not a stopgap — a hosted model would be
an upgrade in phrasing, not in truthfulness.

**Swapping in a real provider** is a single registration against
[`src/lib/ai/provider.ts`](src/lib/ai/provider.ts). Two rules apply:

1. The API key is read server-side only, so a hosted provider needs an endpoint and the
   client becomes a thin `fetch` wrapper.
2. Retrieval still happens locally, and the retrieved entries are the only factual material
   passed to the model. The model rewrites; it does not recall. `checkOutput` then runs on
   whatever comes back.

`VoiceProvider`, `TelephonyProvider` and `BookingProvider` interfaces exist in the same file
so a later voice phase does not require rewriting the website. **None of them are
implemented, deliberately.**

---

## Architecture

```
src/
  data/
    site.ts          VERIFIED facts + explicit `unverified` list
    programs.ts      five programs, official copy quoted with source
    knowledge.ts     the knowledge base — every entry has trust + source
    gallery.ts       photos with alt text written after looking at each image
    demo/portal.ts   SYNTHETIC parent-portal data, clearly marked
  lib/
    ai/
      provider.ts    AIProvider abstraction + future voice/booking interfaces
      local.ts       the shipped provider: deterministic, offline, retrieval-only
      agents.ts      13 agents — 8 live, 5 marked "designed, not built"
      guardrails.ts  input + output checks
    text.ts          BM25 + bigram Dice similarity for typo tolerance
    stepflow.ts      shared multi-step form engine (tour / registration / waitlist)
    searchIndex.ts   the global search corpus
    analytics.ts     privacy-conscious event abstraction
    schema.ts        JSON-LD, restricted to verifiable properties
  components/        Header, Footer, Concierge, SearchDialog, MobileBar, …
  layouts/Base.astro SEO head, schema, noindex switch
  pages/             31 routes
scripts/qa.py        build-output audit
```

### Why Astro

Zero JS by default, real static HTML per route, islands only where a page is actually
interactive. The whole site ships **~97 KB of JavaScript across 18 code-split chunks** —
most pages load a fraction of that. One dependency keeps the surface area honest.

### A gotcha worth knowing

Astro's scoped styles do not reach markup created by `innerHTML` at runtime, because
injected nodes never receive the scoping attribute. Components that render dynamically
(concierge, search, program finder, command centre) keep those rules in an explicit
`<style is:global>` block with a comment saying why. The same applies to a class handed to a
child component's root element — those selectors use `:global()`.

---

## Privacy & security

- No analytics service, no cookies, no third-party scripts, no embedded map
- Events live in an in-memory ring buffer for the session only, so the Command Centre shows
  what actually happened rather than fabricated numbers — and prints `NOT MEASURED`, never a
  fake zero
- Global Privacy Control and Do Not Track are honoured before anything is recorded
- No page asks for a child's date of birth, health data, photograph or surname
- The parent portal has no login screen on purpose: a fake one would imply security that is
  not there
- `scripts/qa.py` scans the tree for API keys, tokens and private keys on every run

---

## Current audit status

```
PAGES BUILT: 31
INTERNAL LINKS: 96 unique | BROKEN: 0
A11Y / SEO ISSUES: 0
SECRET SCAN: 0
JS SHIPPED: 96.8 KB across 18 chunks
```

Keyboard-tested against WCAG 2.2 AA by hand. Known gaps are listed honestly on
[`/accessibility`](src/pages/accessibility.astro) — video caption tracks and the internal
tagging of Tiny Stars' own PDFs.

---

## Going to production

One switch: `PUBLIC_INDEXABLE=true` in the environment. That turns off `noindex`, populates
`sitemap.xml`, and makes canonical URLs live. Replace `public/robots.txt` at the same time.

Do not flip it until this codebase is actually serving tinystars.ca — two versions of the
same business competing in search would hurt the real one.

Still to wire up before launch, all of them deliberate gaps rather than oversights:

- Form endpoints (`/contact.submit` and `/careers.submit` already exist on production)
- The tour flow to the real Calendly booking, which is linked and working today
- Whatever the team wants to publish about fees, availability, ratios and opening time

---

## Assets

All photography, video and PDFs are Tiny Stars' own, mirrored from tinystars.ca. There is no
stock imagery anywhere. The gallery contains no children — the centre's own photographs are
of the spaces, and we would not publish images of children without authorization.
