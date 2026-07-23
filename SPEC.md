# SPEC.md

**Status: settled spec, phased build in progress.** This document is the
source of truth for scope; update it as decisions change. This repo
_is_ the platform — it was bootstrapped from a sibling personal project
(a private job-search tracker) as a template/reference, not a shared
runtime; that original repo is untouched and stays exactly as it was.

## Problem

Standard job search tools filter by keyword match against job descriptions,
which penalizes candidates whose skills are strong but don't literally match
listed requirements. This platform tracks applications through a full
pipeline, learns what the user does/doesn't want from explicit feedback,
adds gamification to keep up activity, and gives employers the equivalent
tooling to find and track candidates. Same platform, both directions,
without becoming a LinkedIn-style social/profile-sharing network — just
matching and pipeline tracking, not networking.

**Core positioning — read this before adding any feature:** this is a
**tracking/management tool first, a job board second.** Posting and
discovery exist to feed candidates into an Employer's board and postings
into a Candidate's board — they are the sourcing mechanism, not the
product. The product, on both sides, is a kanban pipeline, gamified
activity, and preference learning. An Employer's value isn't "a place to
list a job," it's "a place to manage the people you're considering" —
mirroring exactly what a Candidate gets for managing the jobs they're
considering. Any new feature should be checked against this: does it
help someone _manage_ their pipeline, or is it drifting toward "just
another listings site with a search bar"? If the latter, it's probably
out of scope.

## Project structure

- Bootstrapped from the sibling "Job-Search Tracker" personal project as
  a template (auth pattern, gamification pattern, AI BYOK pattern,
  matching-service conventions — copied and adapted, not shared code).
  That original repo is untouched, stays private, single-purpose, unaffected
  by anything here.
- This repo is new, separate, and **public on GitHub**.

## Users & roles

- **Strictly one role per account, chosen at registration**: Candidate
  ("I'm looking for a job") or Employer ("I'm hiring"). No dual-role
  accounts in v1. ✅ built (`AccountRole` enum on `User`, role picker on
  Register).
- **Public/Private is a separate, per-account toggle from the role
  itself** — the key architectural idea that makes the whole thing work
  for both audiences:
  - **Private mode** (default): manual job/candidate tracking, your own
    pipeline, your own gamification, zero visibility to/from anyone
    else. No noise.
  - **Public/Marketplace mode** (opt-in): unlocks discovery — a Candidate
    becomes findable by Employers (per the visibility rules below) and
    can browse/be matched to public postings; an Employer's postings
    become visible to Candidates and they can search/shortlist
    candidates.
  - The platform is genuinely useful standalone (private tracking tool)
    even for users who never flip on public visibility — the marketplace
    is additive, not mandatory.
  - Schema column (`User.isPublic`) exists (defaults off); **enforcing**
    the visibility rules is Roadmap Phase 3, not built yet.

## Roadmap

- ✅ **Phase 0 — done.** Repo bootstrap, candidate-side feature set
  carried over intact (see below), `role` + `isPublic` on `User`,
  registration role picker, minimal Employer placeholder Home page.
- ✅ **Phase 1 — done.** Employer core: `Organization` entity (auto-
  created at registration), `JobPosting` model (paste-based, mirrors
  `JobListing`), `CandidateLead` + `CandidateLeadStageEvent` (manually-
  entered leads against a posting — no discovery yet, so leads are added
  directly rather than sourced), Employer kanban board at `/candidates`
  mirroring the candidate Application board, postings management at
  `/postings`. Both pages guarded so only Employer accounts can reach
  them.
- ⏳ **Phase 2 — next.** Public/private marketplace toggle enforcement +
  candidate discovery for employers (skill/location matching, AI
  recommendations) — this is what turns `CandidateLead`s from
  manually-entered into sourced from real discovered Candidates.
- Freeze/cold (login-streak) + posting-freshness (weekly reconfirm,
  badge-then-30-day-hide) mechanics, both roles.
- Candidate Profile visibility, CV request/approve flow, "hide from
  these companies," work-mode/remote-scope fields.
- Multi-provider AI BYOK (Anthropic/OpenAI/Gemini/Grok/Mistral) + AI
  on/off toggle.
- Moderated feedback form (hard-block wordlist/link filter) + opt-in
  platform statistics page.

## Part 1 — Candidate side (✅ built, carried over from the template as-is)

### 1. Auth

Session-based login (`express-session` + `connect-pg-simple`), register/
login/logout, password hashing (bcrypt), role selection at registration.

### 2. Job ingestion

- Manual paste: title/company/description/link/location/required-skills
  form.
- AI-assisted extraction — paste raw job-ad text, Claude (BYOK) fills the
  form fields automatically.
- Geocoding (Nominatim/OSM) of the location text, best-effort, retryable.

### 3. Swipe (like/dislike)

- Tinder-style like/dislike on a JobListing before it enters the pipeline.
- Dislike reasons (free text) accumulate into a per-user preference
  profile, grouped and counted on the Preferences page.
- Skill-match percentage shown per job (overlap between the user's Skill
  profile and the job's tagged required skills; null when the job has no
  tagged skills, not a misleading 0%).

### 4. Pipeline board (kanban)

- Columns: Liked → Applied → Phone Screen → Technical Interview →
  Interview → Offer, with Rejected reachable from any stage.
- Every transition logs a StageEvent (drives stats, map icon overlays,
  streak calc).
- Stale detection: an Application flagged stale if 14+ days pass with no
  stage change after Applied.
- Rejection letter upload per application (private file).

### 5. Map view

Leaflet + OpenStreetMap tiles (free, no API key). Pins colored by
Application status, positioned from each job's resolved lat/lon.

### 6. Profile

- Skill list (add/remove tags).
- CV upload (Cloudflare R2 object storage).
- AI-assisted skill extraction from an uploaded CV (PDF native, DOCX via
  mammoth text extraction; BYOK).

### 7. Sponsor company tracking (IND visa-sponsor register)

- Bulk import company names (paginated list, search, status filter).
- Per-company outreach tracking: status, notes, careers URL,
  hires-IT-workers flag, `lastOutreachAt` timestamp.
- Jobs flagged `isRecognizedSponsor: true/false/null` by matching company
  name against the imported list.

### 8. Sponsorship toggle + desired-location targeting

- Settings toggle "I need visa sponsorship" — when off, the Sponsors page
  and every sponsor badge/filter disappear app-wide.
- Desired work location(s) (geocoded) + commute radius. Jobs outside
  radius flagged and filterable, independent of the sponsorship toggle.

### 9. Gamification

- Daily quest: applications vs. a configurable target, Duolingo-style
  streak.
- Expanded daily goals: jobs pasted today, sponsor companies reached out
  to today, automatic "opened the app today" check-in.

### 10. AI Coach page

- Deterministic: rolling-7-day activity stats, the single required skill
  missing most across applied-to jobs.
- BYOK Claude calls: alternate-role suggestions, company/job-description
  fit check.

### 11. Settings

Daily targets, sponsorship toggle, commute radius, desired-location list,
AI API key + model (Anthropic only — see multi-provider BYOK below).

### 12. Footer

Ko-fi link + `mailto:` feedback link (still a placeholder — see the
moderated feedback form item in the roadmap).

## Part 2 — Platform core mechanics (not yet built)

### Multi-provider BYOK

Provider-agnostic interface (prompt in, typed JSON out) with one adapter
per provider. Confirmed 5: **Anthropic (Claude), OpenAI (GPT), Google
(Gemini), xAI (Grok), Mistral.** Provider + model dropdown in Settings,
key stored the same way as today (BYOK header, never persisted).

### AI mode toggle

Settings switch: AI off ⇒ every AI-touching entry point disappears
completely (extraction, coaching, matching suggestions, the key/model
fields collapse to just the toggle). Same pattern as the existing
sponsorship toggle.

### Moderated in-app feedback form

Text box, not `mailto:`. **Hard block at submission time** — no manual
review queue: a wordlist/link-pattern filter rejects the submission
outright with an inline error if it trips (banned words, adult content,
links). No held-for-review state, no moderation queue needed for this.

### Platform statistics page

A public, aggregate stats page — a user only counts toward it if they've
opted in (separate from the public/private marketplace toggle, though
realistically only public-mode users would opt in). v1 metric set, kept
deliberately minimal — expand later once there's real usage to learn
from: **total active postings, total public/opted-in candidates.**

## Part 3 — Candidate-side additions for the marketplace (not yet built)

### Candidate Profile (visible to Employers, only in public mode)

Visible fields: **skills, currently-searching status (derived from
freeze/cold state below), desired location(s), and streak.** CV is
**not** visible by default:

- A "allow CV to be viewed" toggle the candidate controls.
- If off, an Employer sees a **"Request CV"** button instead of the file
  — clicking it notifies the candidate, who approves or denies. Approval
  is **persistent but revocable**: that employer keeps access going
  forward (no re-requesting every time) until the candidate explicitly
  revokes it from their side.

### Work mode & remote scope (new field, both sides)

Both a Candidate's search preferences and an Employer's job posting need:
**On-site / Hybrid / Remote.** If Remote, a scope: **Worldwide /
Country-specific / Town-specific** (with the specific country or
town/city attached when scoped). Feeds matching the same way skills and
location already do.

### "Hide from these companies"

Same UI pattern as the existing skill-pill list (`SkillList.jsx`): a
candidate adds company names (and aliases) they don't want to appear to.
Free text, not tied to whether that company has an Employer account here
— this is about hiding from a real-world employer (e.g. your current
job), not about blocking a platform account specifically.

## Part 4 — Employer side (not yet built — Roadmap Phase 1)

### Employer accounts & job posting

- An Employer account represents a hiring company (Organization entity —
  multiple hiring users per company deferred, not v1).
- Employers post real jobs; public in Public mode, otherwise just their
  own private tracking. A new model distinct from the candidate-only
  `JobListing`, since public/shared vs. private/personal behave very
  differently.

### Employer gamification

- Daily quest analog: e.g. review 5 candidate profiles, shortlist 2 —
  configurable targets, same pattern as the candidate side.
- Same streak/check-in mechanics as candidates.

### Employer board (the anchor feature — mirrors the candidate's Application board)

A kanban-style pipeline for candidates the employer is considering,
directly mirroring the existing Application board (candidates move
through stages, not job postings). This is the product; everything below
is a sourcing mechanism that feeds candidates _into_ this board — the
same relationship swiping/pasting has to a candidate's own board today.

### Discovery & matching (sourcing for the board above)

- AI-recommended candidates per posting.
- Employer preferences: "what they don't want" in a candidate (mirrors
  DislikeReason, applied to candidate attributes).
- Location-based candidate discovery, reusing the existing
  DesiredLocation/geocoding infrastructure.
- Skill-based matching (reuses `skillMatch.service.js`'s normalization
  convention, run in the employer's direction).
- Paste-and-compare: paste a candidate's skills/resume text, get an AI
  fit assessment (mirrors the candidate-side company-fit checker).

## Part 5 — Job-posting freshness & the freeze/cold mechanic (not yet built)

Two related but distinct mechanics:

### 1. Login-streak freeze (both roles)

If a user's login-check-in streak breaks, their profile is marked
**cold** — visible to the other side as "not currently active," so
people don't waste outreach on someone who's gone quiet. A warning
appears before/when this happens, explaining why and what it means.

### 2. Posting-freshness enforcement (Employer-specific)

The actual goal: **stop stale job postings from wasting candidates'
time.** A lot of real job boards suffer from employers posting once and
never updating, even after the role is filled. So: each posting needs
**weekly** employer reconfirmation ("still hiring for this?") — folded
into the employer's daily/weekly quest, same UX as any other gamified
check-in. Enforcement is **badge-first, hide-later**:

- Missed one weekly reconfirmation → posting shown to candidates with a
  **"possibly stale"** badge, still fully visible/searchable.
- Still unconfirmed after **30 days** → auto-hidden from active
  candidate search entirely, though it stays visible in the employer's
  own dashboard so they can revive it any time by reconfirming.

This is separate from the employer's own login streak — an employer
could be logging in daily but still be sitting on stale, unconfirmed
postings, and this mechanic catches that specifically.

## Non-goals

- No LinkedIn-style social feed, connections, or profile sharing beyond
  what matching needs — pure job hunting, both directions, not
  networking.
- No automated scraping of ToS-restricted sites.
- No mobile app — responsive web only.
- No messaging/chat system — outreach happens off-platform for now.
- **No admin/moderation panel for now** (deferred, not ruled out) — the
  feedback form's hard-block-at-submission approach and the absence of a
  review queue mean there's nothing to moderate through an admin UI yet.
  Revisit if/when there's real user-generated content that needs human
  review (e.g. reported postings or profiles).

## Feasibility & recommendations

**Is this worth building?** Yes, with a realistic framing: the hard part
of any two-sided marketplace is never the code, it's getting both sides
to show up at once (classic cold-start problem) — a job board with
postings but no candidates, or candidates but no postings, is dead on
arrival regardless of how good the matching is. Plan for this to start
small and specific rather than trying to compete broadly with
LinkedIn/Indeed on day one. Two things give it a real wedge instead of a
generic clone:

1. **The visa-sponsor angle is a genuine, underserved niche** — real IND
   sponsor data already exists from the template project. Launching
   first to "internationals job-hunting in NL who need sponsorship" (and
   NL employers who sponsor) is a much smaller, winnable audience than
   "everyone, everywhere."
2. **Forced posting freshness is a real, commonly-hated pain point** —
   stale listings are one of the most-complained-about things about
   existing job boards. If enforced well, that alone is a legitimate
   differentiator, not just a nice-to-have.

**Risks to go in eyes-open about:** ongoing trust & safety (fake
postings, fake candidates) is a continuous responsibility, not a
one-time build; GDPR matters more once storing other people's CVs/
personal data as a public-facing service; and free-tier hosting
(Neon/R2 free tiers) won't hold up under real public traffic if it gets
any real adoption — revisit hosting cost once there's a public launch
date in view.

**Feature ideas worth considering, beyond what's already scoped:**

- **Verified-employer badge** using the existing IND sponsor dataset as
  a trust signal ("recognized visa sponsor") — nearly free to add given
  the data already available, and directly useful trust signal on a
  platform where fake job postings are a real risk.
- **Salary/compensation range on postings** — commonly requested, cheap
  to add, reinforces the "no-nonsense, function-over-noise" positioning.
- **Match alerts**: notify a candidate when a new posting matches their
  skills/location, and an employer when a new candidate matches — could
  piggyback the existing gamified daily-check-in UX rather than needing
  a separate notification system.
- **Employer funnel analytics** (time-to-fill, drop-off by stage) — the
  StageEvent data model already captures what's needed for this on the
  candidate side; mirroring it for employers is mostly reporting, not
  new data collection.

## Technical decisions

| Decision     | Choice                                                    | Why                                                                |
| ------------ | --------------------------------------------------------- | ------------------------------------------------------------------ |
| Auth         | Session-based                                             | Cheap to build, matches the template                               |
| Map provider | Leaflet + OpenStreetMap                                   | Free, no API key/billing                                           |
| Geocoding    | Nominatim (OSM)                                           | Matches OSM choice, no billing                                     |
| Database     | Postgres                                                  | Local Docker on `5433` (5432 is the template repo's own container) |
| File storage | Cloudflare R2 (S3-compatible)                             | Matches the template                                               |
| AI           | BYOK, multi-provider, per-request header, never persisted | No API cost/liability to the app owner                             |
| Repo         | New, separate, public GitHub repo                         | Distinct project from the template                                 |

Stack otherwise per `CLAUDE.md`: Express (ESM) + Prisma/Postgres backend,
React/Vite/Tailwind/Lucide frontend, Jest/Supertest + Vitest for tests.
