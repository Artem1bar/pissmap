import { defineConfig } from "drizzle-kit";

// `npm run db:generate` compiles lib/db/schema.ts into SQL migrations (no live
// DB needed). `npm run db:push` applies them to Neon — Artem runs it once after
// provisioning DATABASE_URL. Tests apply the same migrations to PGlite.

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
