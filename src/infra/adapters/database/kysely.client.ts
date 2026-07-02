import { Kysely, MysqlDialect, PostgresDialect } from "kysely";
import { createPool as createMysqlPool } from "mysql2";
import pkg from "pg";
import type { Database } from "./db.schema.js";

const { Pool: PostgresPool } = pkg;

/**
 * Technical Configuration Interface for Database Connections
 */
interface DbConnectionConfig {
  readonly countryISO: "PE" | "CL";
}

export const createKyselyClient = (config: DbConnectionConfig): Kysely<Database> => {
  // Peru Context -> Instantiates MySQL 8.4 connection pool
  if (config.countryISO === "PE") {
    const mysqlPool = createMysqlPool({
      host: process.env.MYSQL_PE_HOST || "HOST",
      port: Number(process.env.MYSQL_PE_PORT) || 3306,
      database: process.env.MYSQL_PE_DATABASE || "DATABASE",
      user: process.env.MYSQL_PE_USER || "USER",
      password: process.env.MYSQL_PE_PASSWORD || "PASSWORD",
      connectionLimit: 10,
    });

    return new Kysely<Database>({
      dialect: new MysqlDialect({ pool: mysqlPool as any }),
    });
  }

  // Chile Context -> Instantiates PostgreSQL 17 connection pool
  if (config.countryISO === "CL") {
    const postgresPool = new PostgresPool({
      host: process.env.POSTGRES_CL_HOST || "HOST",
      port: Number(process.env.POSTGRES_CL_PORT) || 5432,
      database: process.env.POSTGRES_CL_DATABASE || "DATABASE",
      user: process.env.POSTGRES_CL_USER || "USER",
      password: process.env.POSTGRES_CL_PASSWORD || "PASSWORD",
      max: 10,
      connectionTimeoutMillis: 2000,
      options: "-c search_path=sch_core,public",
    });

    return new Kysely<Database>({
      dialect: new PostgresDialect({ pool: postgresPool }),
    });
  }

  // Defensive programming edge-case handler
  throw new Error(`Unsupported country ISO context: ${config.countryISO}`);
};
