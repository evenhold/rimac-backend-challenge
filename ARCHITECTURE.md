# Especificación de la Arquitectura del Software

Este proyecto está diseñado bajo los principios de **Clean Architecture** (Arquitectura Limpia). El objetivo principal es mantener un desacoplamiento absoluto entre las reglas de negocio y los detalles de la infraestructura tecnológica (bases de datos, frameworks, servicios en la nube).

La estructura garantiza que la lógica central sea **100% testeable** de forma aislada, sin necesidad de levantar contenedores Docker o conectarse a AWS reales.

---

## Árbol del Proyecto y Mapeo de Componentes

```text
├── src
│   ├── core                   # CAPA DE DOMINIO (Reglas de Negocio Puras)
│   │   ├── types              # Definiciones estricta de contratos de datos
│   │   │   ├── appointment.types.ts
│   │   │   └── __types__
│   │   │       └── appointment.types.spec.ts
│   │   └── use-cases          # Acciones del sistema (Casos de Uso)
│   │       ├── create-appointment.ts
│   │       ├── get-appointments.ts
│   │       └── __tests__
│   │           ├── create-appointment.spec.ts
│   │           └── get-appointments.spec.ts
│   └── infra                  # CAPA DE INFRAESTRUCTURA (Herramientas y Conectores)
│       ├── adapters           # Adaptadores para interactuar con el mundo exterior
│       │   ├── database       # Cliente agnóstico SQL con Kysely ORM
│       │   │   ├── db.schema.ts
│       │   │   ├── kysely.client.ts
│       │   │   └── __tests__
│       │   │       └── kysely.client.spec.ts
│       │   ├── dynamodb.ts    # Conector NoSQL (Estrategia Transaccional Global)
│       │   ├── sns.ts         # Conector Event-Driven (Fan-out Regional)
│       │   └── __tests__
│       │       ├── dynamodb.spec.ts
│       │       └── sns.spec.ts
│       └── handlers           # Puntos de Entrada de AWS Lambda
│           ├── complete       # Cierre de ciclo: Sincroniza EventBridge a DynamoDB
│           │   ├── handler.ts
│           │   └── __tests__
│           │       └── handler.spec.ts
│           ├── ingest         # REST Entrypoint: Validación Zod e Ingesta inicial
│           │   ├── handler.ts
│           │   └── __tests__
│           │       └── handler.spec.ts
│           ├── process-cl     # Worker Chile: Persistencia SQS a PostgreSQL
│           │   ├── handler.ts
│           │   └── __tests__
│           │       └── handler.spec.ts
│           ├── process-pe     # Worker Perú: Persistencia SQS a MySQL
│           │   ├── handler.ts
│           │   └── __tests__
│           │       └── handler.spec.ts
│           └── query          # REST Entrypoint: Lectura síncrona de DynamoDB
│               ├── handler.ts
│               └── __tests__
│                   └── handler.spec.ts
```

---

## Desglose de Capas Técnicas

### 1. Capa Core (Capa Central / Dominio)

Es el núcleo de la aplicación. No depende de ninguna librería externa de AWS o SQL. Si decidimos cambiar Serverless Framework por NestJS o Express en el futuro, esta carpeta se mantiene **intacta**.

- **`types/`**: Contiene la definición de datos compartida y las validaciones de esquemas (Zod). Protege la frontera del sistema asegurando que no ingresen datos corruptos.
- **`use-cases/`**: Contiene la lógica orquestadora del negocio. Por ejemplo, `create-appointment.ts` ejecuta el algoritmo para generar una cita, pero no sabe cómo se guarda físicamente en la base de datos; simplemente invoca interfaces de guardado.

### 🔌 2. Capa Infra (Infraestructura / Detalles)

Contiene las implementaciones tecnológicas necesarias para que los casos de uso cobren vida en la nube.

- **`adapters/`**: Traduce las peticiones abstractas del negocio en llamadas de bajo nivel.
  - `database/`: Aquí es donde ocurre la magia agnóstica de **Kysely**. Convive el dialecto de MySQL (Perú) y PostgreSQL (Chile) de manera transparente para el negocio.
  - `dynamodb.ts` / `sns.ts`: Controladores que usan el SDK oficial de AWS (`@aws-sdk/client-...`) para conectarse con LocalStack o la infraestructura real de Amazon Web Services.
- **`handlers/`**: Son los puntos de entrada oficiales (_triggers_) que registra Serverless Framework en CloudFormation. Actúan como controladores delgados (_Thin Controllers_). Su único trabajo es capturar el evento de AWS (API Gateway HTTP Request o SQS Event Message), desempaquetar el payload y transferir de inmediato la ejecución al Caso de Uso correspondiente en la capa `core`.

---

## Estrategia de Pruebas Automatizadas Colocadas (`__tests__`)

La arquitectura adopta el patrón de **Co-localización de Pruebas**. Cada componente de código tiene su suite de pruebas unitarias (`.spec.ts`) viviendo exactamente en una subcarpeta paralela inmediata llamada `__tests__` o similares.

### Ventajas de este enfoque:

1.  **Navegación Intuitiva:** El desarrollador encuentra la documentación funcional del código al instante sin buscar en un árbol de carpetas espejo al final del proyecto.
2.  **Mantenimiento Seguro:** Al modificar un Caso de Uso o un Adaptador, es evidente visualmente si los tests de cobertura se actualizaron al mismo tiempo.
3.  **Refactorización Rápida:** Simplifica la configuración de Jest/Vitest, aislando las pruebas de infraestructura pesada de las pruebas del dominio puro del negocio.
