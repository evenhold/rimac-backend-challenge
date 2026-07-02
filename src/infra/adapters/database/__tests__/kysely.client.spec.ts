import { describe, expect, test, vi } from "vitest";
import { createKyselyClient } from "../kysely.client.js";

describe("Infrastructure Layer - Kysely Client Factory", () => {
  test("should successfully return a Kysely instance configured with MysqlDialect when countryISO is PE", () => {
    // 1. Arrange
    const contextPE = { countryISO: "PE" as const };

    // 2. Act
    const client = createKyselyClient(contextPE);

    // 3. Assert
    expect(client).toBeDefined();

    // Compile a test query to verify MySQL backtick (`) syntax compilation behavior
    const compiledQuery = client.selectFrom("sch_core.appointments").selectAll().compile();
    expect(compiledQuery.sql).toContain("`appointments`");
  });

  test("should successfully return a Kysely instance configured with PostgresDialect when countryISO is CL", () => {
    // 1. Arrange
    const contextCL = { countryISO: "CL" as const };

    // 2. Act
    const client = createKyselyClient(contextCL);

    // 3. Assert
    expect(client).toBeDefined();

    // Compile a test query to verify PostgreSQL double quote (") syntax compilation behavior
    const compiledQuery = client.selectFrom("sch_core.appointments").selectAll().compile();
    expect(compiledQuery.sql).toContain('"appointments"');
  });

  test("should throw a defensive execution error if an unsupported country ISO bypasses type checking", () => {
    // 1. Arrange
    const invalidContext = { countryISO: "AR" as any };

    // 2. Act & Assert
    expect(() => createKyselyClient(invalidContext)).toThrow("Unsupported country ISO context: AR");
  });
});
