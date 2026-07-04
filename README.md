# Anıl Bürcü

Full-stack mobile engineer. Founder of [icodex studio](https://icodex.dev).

I build mobile apps and run them after launch: Postgres schema, serverless backend, native auth, payments, the React Native layer and the store release process. Two apps are live on the App Store and Google Play, built solo.

![React Native](https://img.shields.io/badge/React_Native-20232A?logo=react&logoColor=61DAFB) ![Expo](https://img.shields.io/badge/Expo-000020?logo=expo&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white) ![Swift](https://img.shields.io/badge/Swift-F05138?logo=swift&logoColor=white) ![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white) ![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)

[Portfolio](https://icodex.dev) · [Email](mailto:anl@icodex.dev) · [LinkedIn](https://www.linkedin.com/in/anil-burcu/)

## Apps

### Bodica

Bodica teaches body language through structured lessons, quizzes and AI photo analysis. Users sign in with Apple, Google or email OTP, and tokens live in hardware-encrypted storage. Subscriptions run through RevenueCat on StoreKit 2, push notifications use actionable categories, and analytics only run after GDPR consent. The backend is Supabase: Postgres with Row Level Security and Edge Functions.

`React Native` · `Expo` · `TypeScript` · `Supabase` · `RevenueCat` · `Sentry` · `PostHog`

[App Store](https://apps.apple.com/app/id6756843038) · [Google Play](https://play.google.com/store/apps/details?id=com.anilburcu.readbody) · [Architecture notes](https://github.com/AnilBurcu/Body-Language-Showcase)

### Radora

Radora helps you learn English by reading. It has a spaced repetition engine for vocabulary, XP, streaks and badges, and a local-first architecture that works offline. The admin panel runs on Next.js and Vercel.

`React Native` · `Expo` · `TypeScript` · `Supabase` · `Zustand` · `TanStack Query`

[App Store](RADORA_APP_STORE_LINKI) · [Google Play](RADORA_PLAY_LINKI) · [Architecture notes](https://github.com/AnilBurcu/Language-App-Showcase)

## How I build

Most of my thinking goes into architecture. I use a feature-based structure: each domain module owns its components, hooks, API layer and state, so modules share the same shape and stay easy to navigate as the codebase grows. Auth, storage, observability and privacy live in a core layer with explicit contracts. I care about making the next change cheap.

Radora is the first app in my React Native monorepo. New apps will be built there, on top of one dependency graph and a shared foundation that grows with each project.

## Work with me

icodex studio takes a small number of client projects: mobile apps built with React Native, Expo and Supabase, from schema design to store release. If you need the whole stack owned by one person, write to me.

[anl@icodex.dev](mailto:anl@icodex.dev) · [icodex.dev](https://icodex.dev)

## Stack

- **Mobile:** React Native, Expo (EAS), TypeScript, Hermes, New Architecture, Swift, UIKit
- **State and data:** Zustand, TanStack Query, react-native-mmkv
- **Backend:** Supabase (Postgres, RLS, Edge Functions), Node.js, Express, MongoDB
- **Auth and payments:** Apple Sign-In, Google Sign-In, OAuth, RevenueCat, StoreKit 2
- **Monitoring:** Sentry with PII scrubbing, PostHog (EU-hosted, consent-gated)
- **Web:** React, Next.js, TypeScript, Tailwind CSS
