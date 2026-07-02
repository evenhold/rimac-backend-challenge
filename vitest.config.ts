import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true, // Permite usar 'describe', 'test', 'expect' sin importarlos en cada archivo
    environment: "node", // Entorno de ejecución de las pruebas
    include: ["src/**/*.spec.ts"], // Patrón para buscar archivos de prueba co-localizados
    reporters: ["verbose"],
    coverage: {
      provider: "v8", // Proveedor de cobertura nativo y ultra rápido
      reporter: ["text", "json", "html"],
    },
  },
});
