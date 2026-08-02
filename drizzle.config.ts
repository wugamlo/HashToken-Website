import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL or NEON_DATABASE_URL must be set; ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
