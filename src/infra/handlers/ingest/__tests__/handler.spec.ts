import { describe, expect, test } from "vitest";
import { formatLog, type ServerConfig } from "../handler";

describe("Handler Ingest - Prueba Inicial", () => {
  test("debería formatear correctamente el mensaje de log con los datos provistos", () => {
    // 1. Arreglar (Arrange)
    const mockConfig: ServerConfig = {
      welcomeMessage: "Conexión exitosa, Entorno Nodejs 24 y Typescript",
      timestamp: "2026-07-02T00:00:00.000Z",
    };

    // 2. Actuar (Act)
    const resultado = formatLog(mockConfig);

    // 3. Afirmar (Assert)
    expect(resultado).toBe(
      "[Rimac challenge] Conexión exitosa, Entorno Nodejs 24 y Typescript: Ejecutado a las 2026-07-02T00:00:00.000Z",
    );
  });
});
