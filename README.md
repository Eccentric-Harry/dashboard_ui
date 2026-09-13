# Life OS — Dashboard UI

React 19 + TypeScript + Vite 8 frontend for the Life OS personal dashboard
(nutrition, finance, calendar/tasks, workouts, learnings, mind, prompts).

## Getting started

```bash
npm install
cp .env.example .env   # VITE_API_BASE_URL, defaults to http://localhost:8080/api/v1
npm run dev            # http://localhost:5173
```

| Script            | What it does                   |
| ----------------- | ------------------------------ |
| `npm run dev`     | Vite dev server with HMR       |
| `npm run build`   | Type-check (`tsc -b`) + bundle |
| `npm run lint`    | ESLint                         |
| `npm run preview` | Serve the production build     |

## Project structure

```
config/                  PostCSS plugins (derived dark theme, solid surfaces)
public/                  Static files served by URL (PWA manifest, service worker, icons)
src/
├── main.tsx             Entry point
├── app/                 App shell: router (App.tsx), route table, navigation config
├── components/
│   ├── layout/          Chrome shared by every route (side rail, top chip, notification center)
│   └── ui/              Generic, domain-agnostic primitives
├── features/            One folder per route/feature
│   └── <domain>/
│       ├── <domain>-page.tsx               Route wrapper rendered by App
│       ├── <domain>-overview-dashboard.tsx Feature root
│       ├── <domain>-overview.css           Styles scoped to the feature
│       └── components/                     Feature-only components
├── services/            API layer: Axios client, safeCall, per-domain services + endpoints
├── store/               Zustand stores (one per domain)
├── types/               Domain types shared by services, stores and UI
├── hooks/               Cross-feature React hooks
├── lib/                 Cross-feature utilities (insights engine, guest interceptor, helpers)
├── mocks/               Guest-mode dummy data and placeholder fixtures
├── styles/              Global CSS: design system, solid-surface, dark theme
└── assets/              Images and audio imported from code
```

### Conventions

- **Imports** — use the `@/` alias (maps to `src/`) across top-level areas; keep imports
  relative inside a feature.
- **Placement** — code used by one feature lives in that feature; promote it to
  `components/ui`, `hooks/` or `lib/` only once a second feature needs it.
- **Naming** — kebab-case files; components exported as named PascalCase exports.
- **Styles** — each feature owns a CSS file with a feature-prefixed root class to avoid leakage.

See the repository-root `CLAUDE.md` and `PROJECT_CONTEXT.md` for architecture details.
