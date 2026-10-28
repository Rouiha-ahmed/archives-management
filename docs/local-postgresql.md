# Native PostgreSQL development on macOS

The development workflow uses a native PostgreSQL server. Docker and Docker Compose are not required.

## Supported server

The project uses Prisma ORM and Prisma Client 7.10.1 with the PostgreSQL driver adapter. The original development target is PostgreSQL 17. Prisma supports both PostgreSQL 17 and 18, and the schema uses features available in both versions (`citext`, UUIDs, JSONB, enums, constraints, triggers, and partial indexes).

If Postgres.app is already running on `127.0.0.1:5432`, keep using that existing data cluster. Do not start a Homebrew PostgreSQL service on the same port at the same time.

For a new Mac without PostgreSQL, install the project target with Homebrew:

```bash
brew install postgresql@17
brew services start postgresql@17
$(brew --prefix postgresql@17)/bin/pg_isready -h 127.0.0.1 -p 5432
```

The project service commands detect Postgres.app first and otherwise use an installed Homebrew PostgreSQL service:

```bash
npm run db:up
npm run db:status
npm run db:down
```

`db:down` stops the shared local PostgreSQL service but never removes its data directory. Do not run it if another local project still needs the server.

## One-time role and database creation

First check whether the objects already exist. These commands do not modify data:

```bash
psql -d postgres -Atc "SELECT rolname FROM pg_roles WHERE rolname = 'archives'"
psql -d postgres -Atc "SELECT datname FROM pg_database WHERE datname = 'archives_db'"
```

Only when the corresponding result is empty, create a dedicated unprivileged login and database. Generate a password, then paste it into `createuser`'s hidden prompts; do not place it directly in shell history:

```bash
openssl rand -hex 32
createuser --login --no-superuser --no-createdb --no-createrole --pwprompt archives
createdb --owner=archives --encoding=UTF8 --template=template0 archives_db
createdb --owner=archives --encoding=UTF8 --template=template0 archives_test
createdb --owner=archives --encoding=UTF8 --template=template0 archives_shadow
```

Put the same URL-safe password only in the ignored `.env` file:

```dotenv
DATABASE_URL="postgresql://archives:YOUR_LOCAL_PASSWORD@127.0.0.1:5432/archives_db?schema=public"
SHADOW_DATABASE_URL="postgresql://archives:YOUR_LOCAL_PASSWORD@127.0.0.1:5432/archives_shadow?schema=public"
TEST_DATABASE_URL="postgresql://archives:YOUR_LOCAL_PASSWORD@127.0.0.1:5432/archives_test?schema=public"
```

The committed `.env.example` contains a placeholder, never a real password. If a chosen password contains URL-special characters, percent-encode it or use a hexadecimal password as shown above.

## Initialize and run

Applying committed migrations preserves existing data and does not run the seed:

```bash
npm install
npm run db:up
npm run db:status
npm run db:deploy
npm run db:generate
npm run db:check
npm run dev
```

Run `npm run db:seed` separately only when intentionally bootstrapping or synchronizing the RBAC seed. It requires secure administrator bootstrap variables if no active administrator exists.

When developing a future schema change, retain the migration workflow:

```bash
npm run db:migrate -- --name descriptive_migration_name
```

Do not use `prisma db push` in this project.
