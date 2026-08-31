/**
 * Database connection is configured with individual variables:
 *
 *   DB_HOST      (default "localhost")
 *   DB_PORT      (default "3306")
 *   DB_USER      (required)
 *   DB_PASSWORD  (default "")
 *   DB_NAME      (required)
 *   DB_PARAMS    (optional, e.g. "connection_limit=5&sslmode=require")
 *
 * Prisma itself only understands a single connection URL (`env("DATABASE_URL")`
 * in schema.prisma), so this module assembles that URL from the parts and
 * publishes it on `process.env.DATABASE_URL` for the Prisma Client, the Prisma
 * CLI (migrate/generate) and the seed script.
 *
 * An explicit `DATABASE_URL` still wins if one is provided.
 */

export function buildDatabaseUrl(): string {
  const explicit = process.env.DATABASE_URL?.trim();
  if (explicit) return explicit;

  const host = process.env.DB_HOST?.trim() || "localhost";
  const port = process.env.DB_PORT?.trim() || "3306";
  const user = process.env.DB_USER?.trim();
  const password = process.env.DB_PASSWORD ?? "";
  const name = process.env.DB_NAME?.trim();
  const params = process.env.DB_PARAMS?.trim();

  if (!user || !name) {
    throw new Error(
      "Database is not configured — set DB_USER and DB_NAME (plus DB_PASSWORD / " +
        "DB_HOST / DB_PORT as needed), or provide a full DATABASE_URL."
    );
  }

  const auth = `${encodeURIComponent(user)}:${encodeURIComponent(password)}`;
  const query = params ? `?${params}` : "";
  return `mysql://${auth}@${host}:${port}/${name}${query}`;
}

// Best-effort side effect: make DATABASE_URL available to everything that reads
// it. Stay silent if the parts aren't set — let Prisma raise the error at the
// point it actually needs a connection (keeps `next build` working offline).
try {
  if (!process.env.DATABASE_URL?.trim()) {
    process.env.DATABASE_URL = buildDatabaseUrl();
  }
} catch {
  /* not configured yet — ignore */
}

export const DATABASE_URL = process.env.DATABASE_URL;
