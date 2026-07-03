# Especificación y Guía de Uso de la API (Ambiente de Desarrollo)

Esta guía documenta los endpoints expuestos en el servidor local para el flujo dirigido por eventos (**Event-Driven**) del Reto AWS-Rimac.

- **Host Base (Serverless Offline):** `http://localhost:3000/dev` (Al ejecutar `pnpm dev`)
- **Host Base (LocalStack Container):** `http://localhost:4566/restapis/lvyuxpqaf4/dev/_user_request_` (Al ejecutar `pnpm infra:deploy`)

---

## 1. Ingesta de Cita Médica (`POST`)

Recibe la solicitud de cita, aplica reglas estrictas de validación sintáctica mediante **Zod**, genera un identificador único en formato UUID, registra la entidad en Amazon DynamoDB con estado `pending` y despacha el evento de forma síncrona a un tópico de **Amazon SNS**.

- **Endpoint:** `/appointments`
- **Método:** `POST`
- **Cabeceras Requeridas:**
  - `Content-Type: application/json`

### Estructura del Cuerpo (JSON Payload)

| Campo            | Tipo    | Validación (Zod)                             | Descripción                                               | Ejemplo   |
| :--------------- | :------ | :------------------------------------------- | :-------------------------------------------------------- | :-------- |
| **`insuredId`**  | String  | Exactamente 5 caracteres numéricos (`^\d+$`) | Código único de identificación del asegurado.             | `"00345"` |
| **`scheduleId`** | Integer | Número entero positivo (`>= 1`)              | Identificador del bloque de horario de la cita médica.    | `4502`    |
| **`countryISO`** | String  | Solo permite los valores fijos `PE` o `CL`   | Define el enrutamiento SNS regional (MySQL o PostgreSQL). | `"PE"`    |

### Comando cURL de Prueba (Serverless Offline)

```bash
curl -X POST http://localhost:3000/dev/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "insuredId": "12345",
    "scheduleId": 4502,
    "countryISO": "PE"
  }'
```

### Respuestas del Servidor

- **`201 Created` (Éxito):** La cita ha sido encolada para su procesamiento.
  ```json
  {
    "message": "Appointment created successfully and queued for processing.",
    "data": {
      "insuredId": "12345",
      "scheduleId": 4502,
      "countryISO": "PE",
      "appointmentId": "cbfdff8a-a3bb-4477-b5c5-a2662f19cced",
      "status": "pending",
      "createdAt": "2026-07-03T03:19:56.153Z"
    }
  }
  ```
- **`400 Bad Request` (Error Zod):** Si el payload viola las restricciones de tipo o longitud.
  ```json
  {
    "message": "Validation Error",
    "errors": {
      "_errors": [],
      "insuredId": {
        "_errors": ["The insuredId must be exactly 5 characters long."]
      }
    }
  }
  ```

---

## 2. Consulta Histórica de Citas (`GET`)

Endpoint síncrono de lectura que escanea y recupera los registros históricos de citas médicas de un asegurado específico directamente desde la tabla de Amazon DynamoDB utilizando su partición.

- **Endpoint:** `/appointments/{insuredId}`
- **Método:** `GET`
- **Cabeceras Requeridas:**
  - `Accept: application/json`

### Parámetros de Ruta (Path Parameters)

| Parámetro       | Tipo   | Validación                                                   | Descripción                                                | Ejemplo |
| :-------------- | :----- | :----------------------------------------------------------- | :--------------------------------------------------------- | :------ |
| **`insuredId`** | String | En la ruta, debe coincidir con un ID existente de 5 dígitos. | Identificador del asegurado cuyas citas se desean auditar. | `00345` |

### Comando cURL de Prueba (Serverless Offline)

```bash
curl -X GET http://localhost:3000/dev/appointments/12345 \
  -H "Accept: application/json"
```

### Respuestas del Servidor

- **`200 OK` (Éxito):** Devuelve la lista completa de citas asociadas al usuario. Si el worker regional finalizó la tarea asíncrona, se apreciará la actualización de estado a `completed`.
  ```json
  {
    "count": 1,
    "data": [
      {
        "createdAt": "2026-07-03T03:19:56.153Z",
        "insuredId": "12345",
        "countryISO": "PE",
        "appointmentId": "cbfdff8a-a3bb-4477-b5c5-a2662f19cced",
        "scheduleId": 101,
        "status": "completed"
      }
    ]
  }
  ```

---

## Limpieza del Entorno Local (Purge Queues)

Si deseas vaciar las colas de mensajes retenidos o con fallos en SQS para realizar una prueba limpia, ejecuta:

```bash
pnpm infra:purge-queues
```

---

## 3. Trazabilidad de Extremo a Extremo (DevOps Auditing Suite)

Dado que este ecosistema se rige bajo un paradigma de **consistencia eventual** y procesamiento dirigido por eventos de forma asíncrona, rastrear un registro a mano inspeccionando contenedor por contenedor puede ser complejo.

Para solucionar esto, se han desarrollado dos flujos de auditoría unificados dentro del `package.json`. Estos comandos actúan como un **Telescopio DevOps**, extrayendo de forma secuencial y cronológica las bitácoras (_logs_) de CloudWatch en LocalStack y escaneando el estado físico final en DynamoDB con una sola instrucción.

### Flujo de Trazabilidad Perú (MySQL / SQS_PE)

Ejecuta este comando en tu terminal para auditar el ciclo de vida completo de una solicitud enrutada a Perú:

```bash
pnpm infra:trace-pe
```

**¿Qué hace este script?**

1. **[STAGE 1] INGEST AND NOSQL INITIAL WRITE:** Extrae los logs de la Lambda `ingest` para certificar la validación sintáctica de Zod y la publicación en el tópico SNS.
2. **[STAGE 2] MYSQL REGIONAL INSERT:** Lee las bitácoras del trabajador `processPe` validando la conexión de red y la inserción exitosa en la tabla de **MySQL**.
3. **[STAGE 3] EVENTBRIDGE LIFECYCLE CLOSURE:** Audita la Lambda `complete` procesando la señal de EventBridge y ejecuta de forma inmediata un `scan` final en DynamoDB para corroborar visualmente el cambio a estado `"completed"`.

---

### Flujo de Trazabilidad Chile (PostgreSQL / SQS_CL)

Ejecuta este comando en tu terminal para auditar el ciclo de vida completo de una solicitud enrutada a Chile:

```bash
pnpm infra:trace-cl
```

**¿Qué hace este script?**

1. **[STAGE 1] INGEST AND NOSQL INITIAL WRITE:** Certifica la recepción del REST endpoint y la salida del evento hacia SNS.
2. **[STAGE 2] POSTGRESQL REGIONAL INSERT:** Examina el comportamiento de la Lambda `processCl`, auditando el ruteo hacia el esquema `sch_core` dentro del contenedor de **PostgreSQL**.
3. **[STAGE 3] EVENTBRIDGE LIFECYCLE CLOSURE:** Captura el cierre del bucle de consistencia eventual y despliega la tabla transaccional de DynamoDB actualizada.
