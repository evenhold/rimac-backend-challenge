# Lista de Entregables del Proyecto (Estado de Tareas)

Este archivo realiza el seguimiento estricto de los requisitos, endpoints y componentes arquitectónicos evaluados para la entrega final del reto de citas médicas.

## 1. Endpoints Obligatorios (Mapeados en API Gateway )

- [x] **POST /appointments**: Handler de ingesta inicial de citas médicas. Valida los payloads mediante Zod, inicializa el estado de la transacción en DynamoDB como `pending` y publica el evento de distribución (_fan-out_) en el tópico de Amazon SNS. Totalmente integrado y verificado mediante curl, retornando HTTP 201 Created.
- [x] **GET /appointments/{insuredId}**: Endpoint de lectura síncrona que recupera el historial de registros médicos de un asegurado específico directamente desde DynamoDB, utilizando expresiones de filtrado por índice primario. Totalmente verificado mediante curl, retornando HTTP 200 OK.

## 2. Infraestructura como Código (IaC)

- [x] **Estructura Completa de `serverless.yml`**: Orquestación automatizada de la infraestructura en la nube mediante Serverless Framework v3 (cero configuraciones manuales).
- [x] **Tabla de Estado en Amazon DynamoDB**: Diseñada de forma optimizada utilizando `insuredId` como clave de partición (HASH Key) y `appointmentId` como clave de ordenamiento (RANGE Key).
- [x] **Tópico de Distribución en Amazon SNS**: Configurado como un concentrador desacoplado para la dispersión de mensajes hacia múltiples motores de bases de datos.
- [x] **Suscripciones Geográficas de Mensajes**: Enrutamiento basado en atributos mediante `FilterPolicy` inyectado a nivel de infraestructura (`countryISO: PE` y `countryISO: CL`).
- [x] **Canales de Ingesta de Tráfico en Amazon SQS**: Colas de procesamiento asíncrono completamente operativas (`SQS_PE`, `SQS_CL` y `SQS_FINAL`).
- [x] **Resiliencia y Tolerancia a Fallos**: Integración de **Colas de Mensajes Muertos (SQS DLQ)** con una política estricta de reintentos automáticos (`maxReceiveCount: 3`).
- [x] **Motor de Reglas de Amazon EventBridge**: Mecanismo de captura y sincronización configurado para redirigir las señales de conformidad de los trabajadores hacia la cola de cierre final.

## 3. Procesamiento Asíncrono Serverless

- [x] **handler: process-pe**: Trabajador asíncrono de Perú que consume de `SQS_PE`. Persiste los registros en MySQL a través de Kysely y emite señales de conformidad a EventBridge que coinciden con los patrones de la regla `EventBridgeToSqsRule`.
- [x] **handler: process-cl**: Trabajador asíncrono de Chile que consume de `SQS_CL`. Persiste los registros en PostgreSQL a través de Kysely utilizando opciones nativas de sesión `search_path` y emite las señales de conformidad a EventBridge.
- [x] **handler: complete**: Cerrador del flujo de trabajo asíncrono que consume de `SQS_FINAL`. Sincroniza el estado de los registros en DynamoDB cambiando de `pending` a `completed` a través de los endpoints internos de `host.docker.internal`.

## 4. Calidad de Código e Integridad Arquitectónica

- [x] **Rigurosidad en Clean Architecture**: Desacoplamiento absoluto de la lógica central del dominio puro frente a los límites de entrada y salida de la infraestructura mediante puertos funcionales.
- [x] **Principios SOLID en Programación Funcional**: Adaptación de comportamientos de responsabilidad única e inversión de dependencias utilizando funciones puras inmutables e inyección de dependencias con tipado estricto.
- [x] **Patrón Repositorio Funcional**: Implementación de capas de abstracción limpias que inyectan los proveedores de datos de infraestructura dentro de los casos de uso del dominio.
- [x] **Patrón Selector de Estrategia Dinámico**: Factoría/Selector funcional que determina los dialectos relacionales de destino en tiempo de ejecución según el contexto del país.
- [x] **Contratos Agnósticos de Base de Datos**: Capa de diseño multimotor completa utilizando **Kysely**, abstrayendo las operaciones de MySQL y PostgreSQL.
- [x] **Validaciones de Frontera Estrictas**: Escudos de seguridad para los esquemas de entrada construidos mediante **Zod**.

## 5. Pruebas, Aseguramiento y Documentación

- [x] **Cobertura de Pruebas Unitarias Robustas**: Suites de simulación (_mocking_) integrales que verifican tanto los dominios centrales como los puertos de infraestructura utilizando **Vitest**, logrando **29 aserciones exitosas pasando en verde**.
- [x] **Suite de Depuración DevOps**: Se agregaron tareas rápidas en la consola dentro de `package.json` para el rastreo unificado de bitácoras y limpieza de colas (`infra:logs-pe`, `infra:logs-cl`, `infra:logs-complete`, `infra:purge-queues`) para auditorías en tiempo real.
- [x] **Estado del Linter y Formateo Global**: 100% aprobado a través del motor de verificación Biome con cero advertencias estructurales.
- [x] **Contrato de Documentación de la API**: Redacción del esquema formal de especificación en el formato estándar **OpenAPI 3.0 / Swagger** (`openapi.yaml`).
- [x] **Guía de Despliegue para Entorno Local**: Manual de usuario paso a paso detallando las fases de instalación y emulación local mediante LocalStack.

---

## Gestión de Deuda Técnica (Estatus Actual)

Durante la fase de integración de herramientas visuales, se identificó y documentó una limitación crítica relacionada con el renderizado nativo de documentación interactiva:

- [x] **Resolución de Assets Estáticos de Swagger UI en Servidor Emulado (Serverless Offline)**:
  - **Problema:** Al intentar acoplar `swagger-ui-express` o inyectar las librerías oficiales de Swagger en un Handler Lambda nativo dentro de `serverless-offline`, el simulador local intercepta las solicitudes de recursos CSS/JS y proxies dinámicos, provocando bloqueos de red (`0 B` transferidos), bucles de redirección infinita (`502 Bad Gateway`) o errores de resolución de carpetas físicas en disco (`EISDIR`).
  - **Mitigación Adoptada:** Para mantener el proyecto limpio, ligero y libre de dependencias duplicadas (antipatrón de doble mantenimiento entre `spec.ts` y `openapi.yaml`), **se adoptó el uso exclusivo del archivo `API_USAGE.md` para explicar detalladamente los endpoints**, sus payloads requeridos (esquemas Zod) y comandos cURL de prueba.
  - **Plan de Acción (Próximo Sprint):**
    1. Consolidar el archivo `API_USAGE.md` como la única fuente de verdad operativa para pruebas rápidas dentro del repositorio, eliminando código basura del backend destinado a servir HTML estático.
    2. En el despliegue de Producción Real en AWS, configurar **AWS API Gateway** para que importe el archivo estándar `openapi.yaml` directamente, renderizando el portal de desarrollador en la nube de forma nativa sin consumir recursos de cómputo en AWS Lambda.
