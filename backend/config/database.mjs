export function databaseProvider(environment) {
  const provider = environment.DATABASE_PROVIDER ?? "postgresql";
  if (!["postgresql", "mysql"].includes(provider)) throw new Error("DATABASE_PROVIDER must be postgresql or mysql");
  return provider;
}
export function databaseUrl(environment, provider = databaseProvider(environment)) {
  const value = environment.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is required");
  let url;
  try { url = new URL(value); } catch { throw new Error("DATABASE_URL must be a valid database URL"); }
  const protocols = provider === "postgresql" ? ["postgresql:", "postgres:"] : ["mysql:"];
  if (!protocols.includes(url.protocol) || !url.hostname || url.pathname.length < 2 || url.hash) {
    throw new Error("DATABASE_URL must match DATABASE_PROVIDER and include a database name");
  }
  return value;
}
