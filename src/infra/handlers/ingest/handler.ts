/**
 * Types
 */

export interface ServerConfig {
  readonly welcomeMessage: string;
  readonly timestamp: string;
}

/** ------------------- */

const serverConfig = {
  welcomeMessage: "Conexión exitosa, Entorno Nodejs 24 y Typescript",
  timestamp: new Date().toISOString(),
};

export const formatLog = (config: ServerConfig): string => {
  return `[Rimac challenge] ${config.welcomeMessage}: Ejecutado a las ${config.timestamp}`;
};

const main = (): void => {
  console.log(formatLog(serverConfig));
};

main();
