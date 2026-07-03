# Rimac AWS Backend Challenge - Sistema de Citas Médicas

Este proyecto implementa una arquitectura dirigida por eventos (_Event-Driven Architecture - EDA_) y principios de _Clean Architecture_ para gestionar de manera asíncrona y eficiente la ingesta y distribución regional de citas médicas entre Perú y Chile.

El entorno está completamente optimizado para **Serverless Framework v3** y emulado localmente mediante **LocalStack** y contenedores **Docker**.

---

## Arquitectura del Ecosistema

El flujo de datos opera de manera asíncrona para garantizar alta disponibilidad y desacoplamiento:

1.  **Ingesta (`POST /appointments`)**: Recibe la solicitud, valida sintácticamente con **Zod**, genera un UUID único, guarda el estado inicial como `pending` en **Amazon DynamoDB** y publica el evento en un tópico de **Amazon SNS**.
2.  **Fan-out Geográfico**: SNS distribuye el evento mediante políticas de filtrado por atributos (`countryISO`) hacia las colas **SQS_PE** (Perú) o **SQS_CL** (Chile).
3.  **Procesamiento Regional (Kysely ORM)**:
    - **Perú (`processPe`)**: Consume de SQS y persiste en **MySQL 8.4** (`medical_pe_db`).
    - **Chile (`processCl`)**: Consume de SQS y persiste en **PostgreSQL 17** (`medical_cl_db`).
4.  **Cierre de Ciclo de Vida**: Los trabajadores emiten una señal a **Amazon EventBridge** (`AppointmentConfirmed`), la cual es redirigida a una cola final SQS, activando la Lambda `complete` para actualizar el registro en DynamoDB al estado definitivo `completed`.

#### Nota de Arquitectura Regional

A pesar de que el enunciado del reto especificaba únicamente el uso de MySQL, se ha integrado de forma intencional PostgreSQL para la operación de Chile. Esto demuestra que la arquitectura del sistema es completamente agnóstica al motor de base de datos. Gracias a la abstracción de capas que provee Kysely ORM, el acoplamiento y la convivencia de múltiples dialectos SQL se resuelven de manera limpia, transparente y escalable sin duplicar lógica de negocio.

---

## Requisitos Previos

Antes de iniciar, asegúrate de tener instalado en tu máquina:

- [Node.js (v20.x o superior)](https://nodejs.org)
- [pnpm](https://pnpm.io) (Gestor de paquetes recomendado)
- [Docker Desktop](https://docker.com) (Activo y ejecutándose)
- [Serverless Framework v3](https://serverless.com)

#### Nota sobre la Versión del Framework:

E proyecto se ha desarrollado y consolidado estrictamente utilizando Serverless Framework v3. Esta decisión se tomó para garantizar la compatibilidad con el modelo de código abierto (Open Source) y evitar las restricciones de licenciamiento comercial que entraron en vigor a partir de la versión 4. Además, la versión 3 asegura una estabilidad absoluta en la integración con el ecosistema de emulación local de LocalStack.

---

## Instalación y Configuración

### 1. Clonar el repositorio e instalar dependencias

```bash
pnpm install
```

### 2. Configurar Variables de Entorno

Crea un archivo llamado **`.env`** en la raíz del proyecto. Copia y pega la siguiente configuración (asegúrate de **no incluir comillas dobles** en los valores para evitar errores de conexión del SDK de AWS):

```env
# --- ENTORNO GLOBAL ---
NODE_ENV=development
AWS_REGION=us-east-1

# --- CONFIGURACIÓN DE PUERTOS  ---
LOCALSTACK_PORT=4566
MYSQL_PE_PORT=3306
POSTGRES_CL_PORT=5432

# --- CONFIGURACIÓN DE BASE DE DATOS PERÚ (MySQL) ---
MYSQL_PE_HOST=localhost
MYSQL_PE_ROOT_PASSWORD=super_secret_root_pass_123
MYSQL_PE_DATABASE=medical_pe_db
MYSQL_PE_USER=rimac_user_pe
MYSQL_PE_PASSWORD=rimac_secure_pass_pe

# --- CONFIGURACIÓN DE BASE DE DATOS CHILE (PostgreSQL) ---
POSTGRES_CL_HOST=localhost
POSTGRES_CL_DATABASE=medical_cl_db
POSTGRES_CL_USER=rimac_user_cl
POSTGRES_CL_PASSWORD=rimac_secure_pass_cl

# --- CONFIGURACION DE DYNAMO ---
DYNAMODB_TABLE=rimac-backend-challenge-appointments-dev
DYNAMODB_ENDPOINT="http://localhost:4566"


# --- CONFIGURACION DE SNS ---
SNS_ENDPOINT=http://localhost:4566
SNS_TOPIC_ARN=arn:aws:sns:us-east-1:000000000000:rimac-backend-challenge-events-topic-dev

# --- CONFIGURACION DE EVENTBRIDGE ----
EVENTBRIDGE_ENDPOINT=http://localhost:4566

```

---

## Inicialización de la Infraestructura Local

### 1. Levantar Contenedores (LocalStack, MySQL y Postgres)

Arranca el motor de Docker Compose en segundo plano:

```bash
docker compose up -d --build
```

### 2. Crear las Tablas Relacionales Regonales

Ejecuta estos dos comandos para inicializar las bases de datos relacionales con los esquemas correctos y dar accesos globales de red a las Lambdas:

```bash
# Inicializar MySQL (Perú)
docker exec -i rimac_challenge_mysql_pe mysql -u root -p"super_secret_root_pass_123" -e "
CREATE USER IF NOT EXISTS 'rimac_user_pe'@'%' IDENTIFIED BY 'rimac_secure_pass_pe';
GRANT ALL PRIVILEGES ON medical_pe_db.* TO 'rimac_user_pe'@'%';
FLUSH PRIVILEGES;
USE medical_pe_db;
CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id VARCHAR(36) NOT NULL UNIQUE,
    insured_id VARCHAR(5) NOT NULL,
    schedule_id INT NOT NULL,
    created_at VARCHAR(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"

# Inicializar PostgreSQL (Chile)
docker exec -i rimac_challenge_postgres_cl psql -U "rimac_user_cl" -d "medical_cl_db" -c "
CREATE SCHEMA IF NOT EXISTS sch_core;
CREATE TABLE IF NOT EXISTS sch_core.appointments (
    id SERIAL PRIMARY KEY,
    appointment_id VARCHAR(36) NOT NULL UNIQUE,
    insured_id VARCHAR(5) NOT NULL,
    schedule_id INT NOT NULL,
    created_at VARCHAR(30) NOT NULL
);
"
```

### 3. Compilar y Desplegar el Stack de AWS en LocalStack

Compila el código TypeScript y despliega las funciones Lambda junto con los recursos de CloudFormation en tu contenedor emulador:

Para realizar esta operación de manera exitosa, el sistema requiere la inyección de las siguientes variables de entorno clave (configuradas en el archivo .env de la raíz):

```env

# --- ENTORNO GLOBAL ---

NODE_ENV=development
AWS_REGION=us-east-1

# --- CONFIGURACIÓN DE PUERTOS ---

LOCALSTACK_PORT=4566
MYSQL_PE_PORT=3306
POSTGRES_CL_PORT=5432

# --- CONFIGURACIÓN DE BASE DE DATOS PERÚ (MySQL) ---

MYSQL_PE_HOST=host.docker.internal
MYSQL_PE_ROOT_PASSWORD=super_secret_root_pass_123
MYSQL_PE_DATABASE=medical_pe_db
MYSQL_PE_USER=rimac_user_pe
MYSQL_PE_PASSWORD=rimac_secure_pass_pe

# --- CONFIGURACIÓN DE BASE DE DATOS CHILE (PostgreSQL) ---

POSTGRES_CL_HOST=host.docker.internal
POSTGRES_CL_DATABASE=medical_cl_db
POSTGRES_CL_USER=rimac_user_cl
POSTGRES_CL_PASSWORD=rimac_secure_pass_cl

# --- CONFIGURACION DE DYNAMO ---

DYNAMODB_TABLE=rimac-backend-challenge-appointments-dev
DYNAMODB_ENDPOINT="http://host.docker.internal:4566"

# --- CONFIGURACION DE SNS ---

SNS_ENDPOINT=http://host.docker.internal:4566
SNS_TOPIC_ARN=arn:aws:sns:us-east-1:000000000000:rimac-backend-challenge-events-topic-dev

# --- CONFIGURACION DE EVENTBRIDGE ----

EVENTBRIDGE_ENDPOINT=http://host.docker.internal:4566

```

```bash
pnpm build
pnpm infra:deploy
```

_Toma nota del ID de REST API devuelto en la consola (ej. `lvyuxpqaf4`), lo necesitarás para los comandos cURL._

```bash
# Ejemplo para el POST
curl -X POST http://localhost:4566/restapis/lvyuxpqaf4/dev/_user_request_/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "insuredId": "00100",
    "scheduleId": 4502,
    "countryISO": "PE"
  }'
```

```bash
# Ejemplo para el GET
curl -X GET http://localhost:4566/_aws/execute-api/lvyuxpqaf4/dev/appointments/00152
```

---

## Comandos de Desarrollo Operativos

El archivo `serverless.yml` utiliza la directiva nativa `useDotenv: true` de la versión 3.

- **Ejecutar Servidor Local Nativo (Serverless Offline):**
  ```bash
  pnpm dev
  ```
  _Levanta la API localmente en el puerto `3000` leyendo el archivo `.env`._
- **Purgar Colas de Mensajes en SQS:**
  ```bash
  pnpm infra:purge-queues
  ```
  _Limpia los mensajes atascados o con fallos del pasado en LocalStack para reiniciar pruebas en limpio._

---

## Pruebas de Integración con cURL

Usa la bandera **`-i`** para verificar directamente los códigos de estado HTTP en la cabecera de la respuesta.

### 1. Lanzar Ingesta de Cita (`POST`)

_Reglas de Validación (Zod): `insuredId` debe ser string de exactamente 5 números, `scheduleId` entero positivo, `countryISO` solo `PE` o `CL`._

```bash
curl -i -X POST http://localhost:3000/dev/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "insuredId": "12345",
    "scheduleId": 4502,
    "countryISO": "PE"
  }'
```

_Respuesta esperada: **`HTTP/1.1 201 Created`** con el objeto en estado `"status": "pending"`._

### 2. Consultar Historial del Asegurado (`GET`)

Tras unos milisegundos de procesamiento asíncrono en los workers y EventBridge, consulta el estado transaccional final:

```bash
curl -i -X GET http://localhost:3000/dev/appointments/12345
```

_Respuesta esperada: **`HTTP/1.1 200 OK`** con la lista de registros y el campo actualizado a `"status": "completed"`._

---

## Visualización Interactiva del Contrato (Swagger Editor)

Si prefieres explorar, validar e interactuar con la especificación de la API sin instalar dependencias de desarrollo ni levantar contenedores adicionales, puedes usar el editor web oficial de la comunidad:

1. Ingresa a la plataforma oficial en la nube: **[Swagger Editor](https://editor.swagger.io/)**
2. Arrastra y suelta el archivo **`openapi.yaml`** de la raíz de este proyecto directamente sobre la ventana izquierda del navegador.
3. El portal web parseará el archivo de forma automática en un milisegundo, renderizando a la derecha una consola interactiva idéntica a la de producción para auditar los esquemas y restricciones de **Zod**.

---

## Guías y Documentación del Proyecto

Para facilitar la auditoría técnica y el despliegue del ecosistema, la documentación se ha fragmentado en módulos especializados. Haz clic en cualquiera de los siguientes enlaces para navegar por los componentes:

- **[Lista de Objetivos y Entregables](./OBJETIVOS.md):** Checklist oficial que certifica el cumplimiento de los requisitos del reto, el estado de las tareas asíncronas y el control de la deuda técnica de Swagger UI.
- **[Manual de Arquitectura y Carpetas](./ARCHITECTURE.md):** Explica los fundamentos de _Clean Architecture_, el desacoplamiento de capas (`core` vs `infra`) y la estrategia de co-localización de pruebas automatizadas (`__tests__`).
- **[Guía de Uso de la API y Endpoints](./API_USAGE.md):** Contiene la especificación detallada de los contratos de entrada y salida, payloads validados con **Zod**, parámetros de ruta y comandos `curl -i` listos para probar en tu terminal.

---
