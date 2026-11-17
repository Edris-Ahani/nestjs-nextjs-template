import { Inject, Injectable } from "@nestjs/common";
import type { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient as PostgresClient, type CatalogItem as CatalogRow, type Prisma } from "../../generated/postgresql/client.js";
import { PrismaClient as MysqlClient } from "../../generated/mysql/client.js";
import { CONFIGURATION, type Configuration } from "../config/runtime-config.js";


// Only the shared query subset is exposed; PostgreSQL-only filters never reach MySQL.
interface PortableDatabaseClient {
  catalogItem: {
    findMany(args: { skip: number; take: number; orderBy: { createdAt?: "desc"; id?: "desc" }[] }): Prisma.PrismaPromise<CatalogRow[]>;
    count(): Prisma.PrismaPromise<number>;
    create(args: { data: CatalogRow }): Prisma.PrismaPromise<CatalogRow>;
    findUniqueOrThrow(args: { where: { id: string } }): Prisma.PrismaPromise<CatalogRow>;
    deleteMany(args: { where: { id: { in: string[] } } }): Prisma.PrismaPromise<{ count: number }>;
  };
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  $queryRawUnsafe(query: string): Promise<unknown>;
  $transaction<T extends Prisma.PrismaPromise<unknown>[]>(operations: [...T],
    options: { isolationLevel: "RepeatableRead" }): Promise<{ [K in keyof T]: Awaited<T[K]> }>;
}
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client: PortableDatabaseClient;
  constructor(@Inject(CONFIGURATION) config: Configuration) {
    if (config.DATABASE_PROVIDER === "postgresql") {
      this.client = new PostgresClient({
        adapter: new PrismaPg({ connectionString: config.DATABASE_URL, max: config.DATABASE_POOL_SIZE,
          connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 }),
        log: [], errorFormat: "minimal",
      });
    } else {
      const url = new URL(config.DATABASE_URL);
      for (const key of url.searchParams.keys()) {
        if (key !== "sslaccept") throw new Error("Unsupported MySQL connection option; configure pool settings through environment variables");
      }
      const ssl = url.searchParams.get("sslaccept");
      if (ssl && ssl !== "strict") throw new Error("MySQL TLS requires sslaccept=strict");
      this.client = new MysqlClient({
        adapter: new PrismaMariaDb({
          host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username),
          password: decodeURIComponent(url.password), database: decodeURIComponent(url.pathname.slice(1)),
          connectionLimit: config.DATABASE_POOL_SIZE, connectTimeout: 5000, acquireTimeout: 5000,
          timezone: "+00:00", ...(ssl ? { ssl: { rejectUnauthorized: true } } : {}),
        }),
        log: [], errorFormat: "minimal",
      });
    }
  }
  async onModuleInit() {
    await this.client.$connect();
    // Fail startup when the selected database has not received the expected schema.
    await this.client.catalogItem.findMany({ skip: 0, take: 1, orderBy: [{ id: "desc" }] });
  }
  async onModuleDestroy() { await this.client.$disconnect(); }
  async ready(): Promise<boolean> {
    try {
      // A fixed, parameter-free probe is portable and never uses user input.
      await this.client.$queryRawUnsafe("SELECT 1");
      return true;
    } catch { return false; }
  }
}
