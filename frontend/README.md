# Taskspace — React Todo Manager

A responsive, single-user todo app built with React, TypeScript, and Vite.

- Create, view, edit, and delete tasks with confirmation before deletion.
- Give each task a title and a status: **To Do**, **In Progress**, or **Done**.
- Track counts and completed tasks at a glance.
- Edit your username in Account / Profile; it updates the header immediately.
- Keyboard-accessible forms, validation, and layouts for mobile and desktop.

Tasks are saved through the NestJS backend in `../todo-backend`, using Supabase
PostgreSQL. Refreshing reloads saved tasks. Profile changes remain in React state;
refreshing restores the username Chetha Puthi. There is no sign-in or per-user
task isolation yet.

## Backend connection

Start the backend in a separate PowerShell terminal:

```powershell
Set-Location "C:\Users\Dell\Documents\LearningWorkspace\todo-backend"
npm run start:dev
```

Start this frontend with `npm run dev`. Open the URL printed by Vite (normally
`http://localhost:5173`). Requests to `/api/todos` are proxied to
`http://localhost:3001/todos` by `vite.config.ts`. API calls live in
`src/api/todos.ts`. The backend's Swagger UI is at `http://localhost:3001/docs`.

`.env.example` documents the optional public `VITE_API_URL` setting. For local
development the default `/api` uses the Vite proxy; no new env file is required.
For a deployed static build, set `VITE_API_URL` to the deployed backend URL before
building and configure that frontend origin in the backend's `FRONTEND_ORIGIN`
(comma-separated). Never put database credentials in frontend variables.

Loading and request failures are displayed in the UI. Failed saves preserve
drafts, failed deletes keep the task visible, and saves prevent duplicate submissions.

## Development

Use Node.js 24 LTS and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite (usually http://localhost:5173).

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
```

The production build is written to `dist`. Existing Vercel configuration serves
this static build; the NestJS backend must be hosted separately, with the API
URL and CORS origins configured as described above.

## Source

- `src/App.tsx`: todo forms, task list, summary, and editable profile.
- `src/types.ts`: task type and the three allowed statuses.
- `src/index.css`: responsive styling, focus indicators, and status colors.
- `src/App.test.tsx`: user interaction, API failure, and reload tests with a mocked API.
- `src/api/todos.ts`: HTTP client for the NestJS Todo endpoints.
- `src/api/todos.test.ts`: HTTP request and error-handling checks.

`public/sw.js` is a migration-only worker kept at the previous worker URL. Returning browsers can use it to retire the habit tracker registration, delete only the legacy habit tracker shell caches, and refresh old controlled pages. This app does not register a service worker or offer offline caching.

Legacy Expo, Supabase, shopping, ledger, and habit tracker features have been removed. Existing ignored local environment files are preserved but are not used by this app.
