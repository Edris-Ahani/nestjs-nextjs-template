export type DatabaseProvider = "postgresql" | "mysql";
export function databaseProvider(environment: NodeJS.ProcessEnv): DatabaseProvider;
export function databaseUrl(environment: NodeJS.ProcessEnv, provider?: DatabaseProvider): string;
