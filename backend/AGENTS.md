# Todo backend agent instructions

## Scope and context

These instructions apply to this NestJS backend and all its subdirectories.
The user is learning NestJS on Windows using PowerShell in VS Code. Explain
changes in plain language and give exact PowerShell commands. When guiding the
user interactively, give one actionable step at a time. When asked to implement
something, make the changes directly and report what was verified.

The stack is NestJS, TypeScript with native ESM, TypeORM, and PostgreSQL hosted
on Supabase. Do not require a local PostgreSQL installation.

## Required architecture: controller, service, repository

Use this dependency direction for every feature:

```text
HTTP request -> Controller -> Service -> Repository -> PostgreSQL
```

### Strict dependency rules

These are mandatory architectural boundaries for production feature code, not
just naming conventions. Constructor injection, imports, method calls, and
public types must respect them.

| Layer | Allowed feature dependency | Forbidden dependencies |
| --- | --- | --- |
| Controller | Its feature service | Repositories, persistence entities, TypeORM, database clients |
| Service | Its feature repository; another feature's exported service when needed | Controllers, TypeORM APIs/types, database clients, HTTP request/response objects |
| Repository | TypeORM, persistence entities, database clients | Controllers, services, HTTP DTOs, HTTP exceptions |

- Never skip a layer: no controller-to-repository or service-to-database access,
  even for a simple read or a one-line operation.
- Dependencies point downward only. A repository must never import, inject, or
  call a service; a service must never depend on a controller.
- Do not create circular dependencies or use `forwardRef()`, `ModuleRef`, service
  locators, static access, or manual provider construction to bypass these rules.
- Keep TypeORM `Repository`, `DataSource`, `EntityManager`, `QueryRunner`,
  `QueryBuilder`, `FindOptions*`, and database errors inside the persistence
  implementation. Do not expose them in repository method signatures or require
  services/controllers to build query options.
- Repository methods express application operations, for example `findById(id)`,
  `create(input)`, `updateById(id, changes)`, and `deleteById(id)`. Do not expose
  the underlying ORM instance, an unrestricted `query(sql)` method, or a generic
  `execute(callback)` escape hatch to upper layers.
- Controllers use request/response DTOs and services use plain application data.
  Define shared plain types in a neutral file when necessary. Do not import DTOs
  from a controller file or force repositories to depend on validation-decorated
  HTTP DTO classes.
- Services may receive entity values returned by a repository as the existing
  project convention permits, but must not instantiate entities, invoke persistence
  methods, or depend on ORM metadata. Prefer plain result types if entity coupling
  grows; controllers must not import persistence entities, even with `import type`.
- Type-only imports do not excuse a forbidden dependency. Shared status constants
  or types needed outside persistence should live in a neutral feature file rather
  than require a controller to import `todo.entity.ts`.
- Cross-feature calls go through the owning feature's exported service. Do not
  inject another feature's repository into a controller, service, or repository.
- Keep transactions behind operation-specific repository methods or a dedicated
  persistence abstraction with plain inputs/results. Do not pass an ORM manager,
  query runner, or query-building callback into service code.
- Nest modules, database configuration, migrations, and dependency-injection
  composition are wiring code and may reference the classes needed to assemble
  the application. This does not permit query execution in modules/controllers/
  services. Tests may import the units they exercise and mock their collaborators.
- Before finishing a feature change, review imports, constructor injections, and
  repository signatures against these rules. Do not claim automated architectural
  enforcement unless an actual lint rule or architecture check has been added.

### Controller: HTTP boundary

- Declare routes, receive DTOs and route parameters, and call the service.
- Use pipes to validate UUID parameters and request bodies.
- Choose HTTP status codes and response shapes appropriate to the endpoint.
- Keep controllers thin: no business rules, TypeORM injection, SQL, query
  builders, or direct database access.
- Never call a repository directly from a controller.

### Service: application behavior

- Implement business rules, coordinate operations, and call the feature repository.
- Handle application outcomes such as a missing Todo. Nest exceptions such as
  `NotFoundException` are acceptable here; do not introduce additional layers
  solely to avoid them.
- Inject the feature repository through Nest dependency injection.
- Do not inject TypeORM repositories, use SQL/query builders, or accept Express
  request/response objects in services.
- Coordinate transactions for multi-write operations through repository methods
  or an explicit transaction abstraction. Keep query implementation in repositories.

### Repository: persistence

- Create an injectable feature class, for example `TodosRepository`.
- Inject TypeORM's `Repository<Todo>` using `@InjectRepository(Todo)`.
- Wrap TypeORM using composition; do not extend TypeORM's `Repository` class.
- Own persistence operations, queries, filtering, and database-specific details.
- Return entities, collections, or an explicit missing result for the service
  to interpret. Do not throw HTTP exceptions from repositories.
- Use parameterized queries. Do not interpolate user input into SQL.
- Use explicit input fields when creating or updating records; do not pass an
  unchecked request body directly to TypeORM.
- Do not swallow database errors or treat a failed query as an empty result.

### Feature structure and wiring

Use a feature folder with this structure as the Todo API is implemented:

```text
src/todos/
  todos.module.ts
  todos.controller.ts
  todos.service.ts
  todos.repository.ts
  todo.entity.ts
  dto/
    create-todo.dto.ts
    update-todo.dto.ts
```

- Register `TypeOrmModule.forFeature([Todo])` in `TodosModule`.
- Register `TodosService` and `TodosRepository` as providers and the controller
  under `controllers`. Import `TodosModule` into `AppModule`.
- Export only services needed by other features. Keep repositories internal to
  their owning feature; cross-feature access must use the exported service.
- Keep DTO validation separate from entity persistence metadata. Use explicit
  response mapping if entities acquire fields that must not reach clients.
- Prefer concrete injectable classes. Add repository interfaces, injection
  tokens, base repositories, or extra layers only when a real requirement calls
  for them.

## Todo contract and frontend compatibility

The existing React frontend is in `../TechprecneurReactCourse`. Read its current
types and UI behavior before changing the API contract.

### Frontend reference

- Absolute directory: `C:\Users\Dell\Documents\LearningWorkspace\TechprecneurReactCourse`.
- App name: Taskspace, a responsive single-user Todo workspace.
- Stack: React 19, TypeScript 6, Vite 8, plain CSS, Lucide React icons, and Geist
  Variable font. Check `package.json` for exact versions before dependency work.
- `src/App.tsx` contains `App`, `TodoForm`, and `Profile`, task CRUD interactions,
  task summaries, and username editing.
- `src/types.ts` defines `Todo`, `TodoStatus`, and `STATUSES`; use this as the
  frontend contract reference.
- `src/index.css` owns responsive layouts, green status styling, focus states,
  and other visual styles. Preserve the existing appearance during API wiring.
- `src/App.test.tsx` uses Vitest and React Testing Library for create, edit,
  validation, cancel, delete, and profile interactions. `vite.config.ts` sets up
  jsdom and `src/test/setup.ts`.
- `README.md` describes current app behavior, backend integration, and scripts.
- Run `npm run dev` from the frontend directory. Vite normally uses
  `http://localhost:5173`, but use the URL printed by the terminal; there is no
  explicit server port in the current Vite config. The `/api` proxy forwards to
  `http://localhost:3001` and removes the `/api` prefix.
- Frontend verification commands are `npm run typecheck`, `npm test`,
  `npm run lint`, and `npm run build`. Do not run backend commands from this folder.

### Current behavior and integration boundaries

- Tasks load through `src/api/todos.ts` on mount and are persisted in Supabase
  through the NestJS endpoints. React state reflects successful API responses.
- The server/database creates IDs. The UI appends newly saved tasks, edits
  title/status through PATCH, and asks for confirmation before DELETE.
- Creating a task trims its title and resets the form to an empty title and
  `To Do`. Preserve validation, cancel behavior, and accessible error messages.
- Summary cards count each status; completion counts tasks whose status is `Done`.
- The username starts as `Chetha Puthi`, is editable in the profile panel, and
  updates the header. It remains local state; there is no authentication,
  users table, or Todo ownership relationship in the current schema.
- Refresh reloads tasks from the backend but resets the profile name. The UI
  explains this distinction; profile persistence is not implemented.
- Existing ignored `.env` files and the legacy `expo-app` directory are not the
  active frontend integration. Do not reuse old Supabase variables or revive
  removed features by assumption.
- When integration is requested, send browser requests to the NestJS API, not
  directly to PostgreSQL. Put API calls in a small frontend API module and use
  server-returned records/IDs as the source of truth.
- The API client reads `VITE_API_URL`, defaulting to `/api` for the development
  proxy. `.env.example` documents this public setting. Production static builds
  need the deployed backend URL set at build time. Never place a database
  password or privileged Supabase key in any `VITE_*` variable.
- `src/configure-app.ts`, called by `src/main.ts`, configures global request
  validation and CORS. `FRONTEND_ORIGIN` can override the comma-separated allowed
  origins; defaults are `http://localhost:5173` and `http://127.0.0.1:5173`.
- Loading, retry, submission, and failure states are implemented. Preserve form
  input on failed saves and prevent duplicate submissions in future changes.
- Update frontend tests to mock API boundaries when integration changes the
  current in-memory behavior. Do not make browser unit tests depend on Supabase.

Its current Todo shape is:

```typescript
type TodoStatus = 'To Do' | 'In Progress' | 'Done';
interface Todo {
  id: string; // UUID
  title: string;
  status: TodoStatus;
}
```

- Preserve the exact status strings and casing.
- Generate IDs on the server/database when creating records; do not require a
  client-supplied ID.
- Validate titles as strings, trim input, and reject blank titles. Validate
  status against the allowed values.
- For updates, distinguish omitted fields from invalid values. Do not overwrite
  fields that were omitted or allow clients to change the ID.
- Implemented CRUD routes are `GET /todos`, `GET /todos/:id`, `POST /todos`,
  `PATCH /todos/:id`, and `DELETE /todos/:id`.
- Return 400 for invalid input and 404 for a missing Todo. Keep collection ordering
  explicit and stable once the API is implemented.
- The frontend is connected to these endpoints. GET lists are ordered by UUID
  ascending, which is stable but does not represent creation time.

## Database configuration and migrations

### Connection reference

These are the current non-secret development settings, verified from the local
configuration. Read `.env` at runtime; do not hardcode these in application code.

| Setting | Value |
| --- | --- |
| Supabase project name | Todo-app |
| Project reference | `vlzsucfkbzvhfzpgwaxl` |
| Region | Tokyo / `ap-northeast-1` |
| Connection method | Supabase Session pooler |
| `DB_HOST` | `aws-0-ap-northeast-1.pooler.supabase.com` |
| `DB_PORT` | `5432` |
| `DB_DATABASE` | `postgres` |
| `DB_USERNAME` | `postgres.vlzsucfkbzvhfzpgwaxl` |
| Database schema | `public` |
| `DB_PASSWORD` | Private; stored only in ignored `.env` |
| Root CA file | `prod-ca-2021.crt` in the backend root |
| Backend HTTP address | `http://localhost:3001` (`PORT=3001`) |

The project API URL is `https://vlzsucfkbzvhfzpgwaxl.supabase.co`. It is not a
PostgreSQL hostname. The direct host
`db.vlzsucfkbzvhfzpgwaxl.supabase.co` failed DNS resolution in this environment;
use the configured Session pooler. Port 3000 was occupied during setup, so the
backend was moved to 3001. Recheck local configuration when troubleshooting.

### Current schema and migration state

| Column | PostgreSQL definition | Frontend meaning |
| --- | --- | --- |
| `id` | UUID primary key, default `gen_random_uuid()` | String task identifier |
| `title` | `text NOT NULL`, check `length(btrim(title)) > 0` | Task title |
| `status` | `public.todo_status NOT NULL`, default `To Do` | Exact UI status |

- Enum values are exactly `To Do`, `In Progress`, and `Done`.
- There are no timestamp, user, description, priority, or ordering columns yet.
  Add a new migration if a later feature needs them; do not pretend UUID order
  represents task creation order.
- Entity: `src/todos/todo.entity.ts`.
- Initial migration: `src/database/migrations/1792195200000-create-todos.ts`,
  class `CreateTodos1792195200000`.
- The user reported running the initial migration successfully. Check
  `npm run migration:show` to verify the live database rather than treating this
  document as a live migration status report.
- Its `down` migration drops `public.todos` and `public.todo_status`, including
  task data. It is not a harmless connection check.
- Row-level security is enabled with no browser access policies in this migration.
  The configured PostgreSQL role is privileged; RLS does not provide per-user
  isolation for this backend. Add authentication/authorization deliberately if
  multi-user behavior is later requested.
- `src/todos/` now contains the module, controller, service, repository, request
  DTOs, response DTO, entity, and neutral shared types in `todo.types.ts`.
  Todo CRUD and the existing root welcome route are implemented.

### Configuration rules

- Share connection options through `src/database/database.options.ts`.
- The TypeORM CLI data source is `src/database/data-source.ts`.
- Keep `synchronize: false` and `migrationsRun: false`. Apply schema changes with
  explicit migrations in `src/database/migrations/`.
- Register new entities and migrations in the shared database options.
- Include both `up` and `down` in every migration. Do not edit an already-applied
  migration to change the schema; add another migration.
- Keep entity metadata and migrations consistent, including defaults, enum names,
  nullability, and constraints.
- The existing Todo migration creates `public.todos` with UUID IDs, a required
  nonblank title, and the `public.todo_status` enum. Row-level security is enabled;
  access is intended through the NestJS backend using its configured database role.
- Use Supabase Session pooler settings from `.env`; do not guess hostnames.
- Preserve TLS certificate verification using `prod-ca-2021.crt`. Do not solve
  certificate errors by disabling verification or setting
  `NODE_TLS_REJECT_UNAUTHORIZED=0`.
- Never print, commit, or include database passwords in responses. Keep `.env`
  ignored by Git and use placeholders in examples. Do not overwrite existing
  credentials during unrelated work.
- Distinguish creating a migration file from applying it to Supabase. Report
  clearly whether schema changes were applied. Avoid destructive rollback or
  data changes unless the task authorizes them.

## TypeScript and verification

### Swagger / OpenAPI

- Swagger is configured by `src/swagger.ts` and registered in `src/main.ts`.
- Local documentation: `http://localhost:3001/docs`; OpenAPI JSON:
  `http://localhost:3001/docs-json`. Both follow the configured backend port.
- Document implemented controller operations using Swagger tags, summaries,
  response schemas, and relevant error responses. Document DTO fields with
  `ApiProperty` / `ApiPropertyOptional` when adding the Todo API.
- Swagger decorators belong on controllers and HTTP DTOs, not services,
  repositories, or persistence entities. Keep the three-layer boundaries intact.
- Swagger metadata does not perform runtime input validation; configure pipes
  and validators separately when implementing request handling.
- The root route and all five Todo CRUD routes are documented, including request
  and response schemas. Authentication is not implemented.

- Follow existing ESM conventions: use `.js` extensions for relative TypeScript
  imports and `import type` for type-only imports.
- Use the installed dependency versions and inspect their APIs rather than
  assuming this project uses an older NestJS or TypeORM release.
- Before adding a package, check whether it is already declared and installed.
- Use Vitest and the existing test setup. Test controller HTTP behavior, service
  business rules with a mocked feature repository, and persistence behavior where
  it needs database verification. Do not connect unit tests to live Supabase.
- Run `npm run build` after TypeScript changes and relevant tests for behavior
  changes. Do not run tests for documentation-only edits.
- Avoid repeated connection attempts when authentication fails. Stop clients,
  correct credentials, and allow Supabase's temporary lockout to expire.

Useful commands, run from the backend directory:

```powershell
npm run build
npm test
npm run start:dev
npm run migration:show
npm run migration:run
```

`npm run migration:revert` rolls back the most recent migration and can delete
data. Use it only when rollback is intended. The development port comes from
`PORT` in `.env` (currently 3001); check the configuration before assuming a port.
