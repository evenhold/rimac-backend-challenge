import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CreateAppointmentSchema } from "../../../core/types/appointment.types.js";
import { createAppointmentUseCase } from "../../../core/use-cases/create-appointment.js";
import { saveAppointmentState } from "../../adapters/dynamodb.js";
import { publishAppointmentEvent } from "../../adapters/sns.js";

/**
 * Global HTTP Headers standard enforcing secure JSON transmissions
 */
const HTTP_HEADERS = {
  "Content-Type": "application/json",
};

/**
 * Synchronous AWS Lambda Handler facing API Gateway for Appointment Ingestion.
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Guard against null or missing body inputs
    if (!event.body) {
      return {
        statusCode: 400,
        headers: HTTP_HEADERS,
        body: JSON.stringify({ message: "Missing request body payload." }),
      };
    }

    // 2. Parse the raw transport string safely into a JavaScript Object
    const rawJson = JSON.parse(event.body);

    // 3. Run the object through the strict Core Domain Zod schema shield
    const validationResult = CreateAppointmentSchema.safeParse(rawJson);

    // 4. If payload boundaries fail, return immediate validation feedback
    if (!validationResult.success) {
      return {
        statusCode: 400,
        headers: HTTP_HEADERS,
        body: JSON.stringify({
          message: "Validation Error",
          errors: validationResult.error.format(),
        }),
      };
    }

    // 5. Invoke core domain business logic, injecting physical AWS adapter ports
    const appointmentEntity = await createAppointmentUseCase(validationResult.data, {
      saveAppointment: saveAppointmentState,
      publishEvent: publishAppointmentEvent,
    });

    // 6. Return successful creation feedback to the client policyholder
    return {
      statusCode: 201,
      headers: HTTP_HEADERS,
      body: JSON.stringify({
        message: "Appointment created successfully and queued for processing.",
        data: appointmentEntity,
      }),
    };
  } catch (error) {
    // Defensive global exception catching to guard against corrupted runtime states
    console.error("Ingest Handler Critical Failure:", error);
    return {
      statusCode: 500,
      headers: HTTP_HEADERS,
      body: JSON.stringify({ message: "Internal Server Error." }),
    };
  }
};
