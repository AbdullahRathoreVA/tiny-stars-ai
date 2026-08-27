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

Node 20+. Two runtime dependencies: `astro` and `three`.

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

## The 3D layer

Progressive enhancement, strictly. Three.js is **never** in the initial bundle — it
downloads only when a scene is about to scroll into view *and* the device has been
judged capable. First paint carries **35.5 KB of JavaScript**; the 3D loader is 6.8 KB
of that, and `three` (717 KB) is a separate chunk many visitors never request.

```
src/lib/three/
  quality.ts    device tiering, DPR cap, frame monitor, manual override
  stage.ts      shared lifecycle: visibility/viewport pausing, on-demand
                rendering, full GPU disposal, context-loss recovery
  kit.ts        palette (mirrors tokens.css), shared materials, procedural shapes
  scenes/
    hero.ts           ambient starfield + drifting objects behind the photograph
    constellation.ts  the site map as a star map
    day.ts            the miniature room with eight camera routes
    programs.ts       five programs plotted along a real age axis
    agents.ts         the agent network, idle until a message actually routes
    gallery.ts        real photographs drifting in depth
```

**Five scenes, measured:** hero 15 draw calls / 648 tris · programs 12 / 1,360 ·
constellation 26 / 2,236 · agents 40 / 4,824 · day 112 / 5,376.

Everything is procedural — there are no model files, which is why the first 3D frame
arrives in a few hundred milliseconds rather than several seconds on a phone.

### Five tiers

`ultra · high · balanced · low · minimal`, chosen from device memory, core count,
viewport, pointer type and DPR — then biased downward, because a parent on a
three-year-old Android is who this site is for. Reduced motion or Save-Data forces
`minimal`, which loads **no WebGL at all**. A frame monitor steps the whole site down
a tier if the median frame time stays over budget.

Readers can override it on `/about-this-demo` (Auto / Enhanced / Minimal).

### Nothing important lives in a canvas

Every star in the constellation is also a link in the list beside it. Every marker in
the day room is also a `<button>` in a roving-focus toolbar. Communication is
event-based in both directions (`ts:node`, `ts:zone`, `ts:program`, `ts:agent`), so a
scene that never loaded simply never hears the event and the HTML carries the page.

The concierge uses the same channel: an `AIResponse` may carry a `spotlight`, and the
page points at what the answer is about — flying the room camera to the outdoor area
when someone asks about outdoor play. It is emphasis, never the answer itself.

### Depth without WebGL

Most of the site's sense of depth is CSS: `.depth[data-tilt]` cards tilt toward the
pointer within a hard 4° ceiling, layers parallax within 14px. One rAF drives all of
it and stops when nothing is moving. Gated *positively* on a fine pointer, motion
allowed, and a tier above minimal — expressing the condition once rather than applying
it and trying to win it back with an override.

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

### Two gotchas worth knowing

**Astro scoping.** Scoped styles do not reach markup created by `innerHTML` at runtime,
because injected nodes never receive the scoping attribute. Components that render
dynamically (concierge, search, program finder, command centre) keep those rules in an
explicit `<style is:global>` block with a comment saying why. The same applies to a class
handed to a child component's root element — those selectors use `:global()`, and
`Stage3D` takes a `fill` prop rather than expecting the parent to position it.

**Verifying without a compositor.** A headless or hidden browser pane produces no frames,
so `IntersectionObserver` never fires and CSS transitions freeze mid-flight. Scenes were
verified by mounting them directly and reading `renderer.info.render` and `gl.readPixels`,
which is a more precise check than a screenshot anyway.

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
INTERNAL LINKS: 101 unique | BROKEN: 0
A11Y / SEO ISSUES: 0
SECRET SCAN: 0
JS ON FIRST PAINT: 35.5 KB   (three.js, 717 KB, is not in it)
```

Keyboard-tested against WCAG 2.2 AA by hand. Known gaps are listed honestly on
[`/accessibility`](src/pages/accessibility.astro) — verbatim video captions and the internal
tagging of Tiny Stars' own PDFs. Clips carry description tracks; run
`GROQ_API_KEY=... python scripts/captions.py --transcribe` to add real captions.

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
stock imagery anywhere. The `/experience/gallery` set is spaces only. The "Inside Tiny Stars"
media added later does show children at the centre; it was supplied by Tiny Stars, and
`SHOW_CHILDREN` in [`src/data/media.ts`](src/data/media.ts) turns all of it off in one edit if
a family asks. One supplied clip is AI-generated and is labelled as such wherever it appears.
