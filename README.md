<div align="center">

# Anıl Bürcü

**Full-stack mobile engineer.** Founder of [icodex studio](https://icodex.dev).

I build mobile apps and own them after launch — Postgres schema, serverless backend,
native auth, billing, the React Native layer, and the store release process.

[![React Native](https://img.shields.io/badge/React_Native-20232A?style=flat-square&logo=react&logoColor=61DAFB)](#)
[![Expo](https://img.shields.io/badge/Expo-000020?style=flat-square&logo=expo&logoColor=white)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](#)
[![Swift](https://img.shields.io/badge/Swift-F05138?style=flat-square&logo=swift&logoColor=white)](#)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white)](#)
[![Postgres](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](#)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)](#)

[**icodex.dev**](https://icodex.dev) · [**anl@icodex.dev**](mailto:anl@icodex.dev) · [**LinkedIn**](https://www.linkedin.com/in/anil-burcu/)

</div>

---

## Shipped

### Bodica &nbsp;·&nbsp; live on the App Store and Google Play

Teaches people to read body language through lessons, quizzes, and AI photo analysis.

Photos are analyzed by a Supabase Edge Function calling Gemini, so keys and prompts never reach the client. Each request is keyed on `(user_id, request_id)`, which makes retries free — a backgrounded app or a dropped response returns the stored result instead of re-charging quota. Sign-in runs natively through Apple, Google, or email OTP with no browser redirect; tokens live in hardware-encrypted storage and refresh is serialized behind a mutex. Billing is the most defended part: the paywall runs a preflight conflict check before Apple or Google billing is ever triggered, subscription transfers require server-side proof rather than a client claim, and a monotonic event gate stops a late webhook retry from clobbering fresher state.

`React Native` `Expo` `TypeScript` `Supabase` `Gemini` `RevenueCat` `Sentry` `PostHog`

[App Store](https://apps.apple.com/app/id6756843038) · [Google Play](https://play.google.com/store/apps/details?id=com.anilburcu.readbody) · [**Architecture notes →**](https://github.com/AnilBurcu/Body-Language-Showcase)

### Radora &nbsp;·&nbsp; in development

Learn English by reading, rather than by drilling word lists in isolation.

The study engine is a pure state machine with no imports: one scheduled queue where answering a word re-inserts it at a variable distance ahead, so repetitions expand as you get them right and a missed word comes back sooner. All of its jitter comes from a seeded PRNG, which keeps the reducer deterministic and unit-testable without mocks. Long-term scheduling is server-authoritative — Postgres decides mastery and the next review date, so a word can't be farmed to "mastered" in one sitting. Failed writes land in idempotent MMKV queues and drain on reconnect. Premium content is filtered by Row Level Security rather than a client-side check.

`React Native` `Expo` `TypeScript` `Supabase` `Zustand` `TanStack Query` `RevenueCat`

[**Architecture notes →**](https://github.com/AnilBurcu/Radora-Showcase)

## How I build

```mermaid
flowchart TB
    b["<b>Bodica</b><br/><small>shipped</small>"]
    r["<b>Radora</b><br/><small>in development</small>"]
    n["<b>Next app</b>"]
    p["<b>Shared foundation</b> — one dependency graph<br/><small>auth · push · subscription · supabase-core<br/>telemetry · ui-kit · onboarding · permissions</small>"]
    s["<b>Backend, per product</b><br/><small>Postgres + RLS · Edge Functions · RevenueCat</small>"]

    b --> p
    r --> p
    n -.-> p
    p --> s

    classDef a fill:#1f6feb,color:#fff,stroke:#1f6feb
    classDef sh fill:#7c3aed,color:#fff,stroke:#7c3aed
    classDef bk fill:#0d9488,color:#fff,stroke:#0d9488
    class b,r,n a
    class p sh
    class s bk
```

Most of my thinking goes into architecture. I use a feature-first structure — each domain module owns its components, hooks, API layer, and state — so modules share one shape and stay navigable as the codebase grows. Auth, storage, observability, and privacy live in a core layer behind explicit contracts.

The packages above hold one hard rule: **no package depends on another package's tables.** `push` doesn't know about `auth`; `subscription` doesn't know about `push`. They all reference `auth.users` and nothing else. That constraint is what makes the second app cheap to start and the third one cheaper.

Three principles I keep coming back to:

- **The server decides, the client reconciles.** Scheduling, quotas, XP, and entitlement are computed in Postgres. The client sends intent and applies the answer. Anything a tampered build could lie about doesn't get to be authoritative.
- **Idempotency before retry.** Every write that might be replayed was designed to be replay-safe first — which is what makes an aggressive retry policy affordable instead of dangerous.
- **Failure modes are chosen, not discovered.** Quota exhaustion clamps rather than blocks. Realtime degrades to a stale-time refresh. Stale queued writes expire instead of resurrecting. Each is a decision written down where the code lives.

I care about making the next change cheap.

## Stack

| | |
| --- | --- |
| **Mobile** | React Native, Expo (EAS), TypeScript, Hermes, New Architecture, Swift, UIKit |
| **State & data** | Zustand, TanStack Query, react-native-mmkv |
| **Backend** | Supabase (Postgres, RLS, Edge Functions), Node.js, Express, MongoDB |
| **Auth & payments** | Apple Sign-In, Google Sign-In, OAuth, RevenueCat, StoreKit 2 |
| **Observability** | Sentry with PII scrubbing, PostHog (EU-hosted, consent-gated) |
| **Web** | React, Next.js, TypeScript, Tailwind CSS |

## Work with me

icodex studio takes a small number of client projects: mobile apps built with React Native, Expo, and Supabase — from schema design through store release. If you want the whole stack owned by one person, get in touch.

[**anl@icodex.dev**](mailto:anl@icodex.dev) · [**icodex.dev**](https://icodex.dev)
