import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getAppointmentsUseCase } from "../../../core/use-cases/get-appointments.js";
import { getAppointmentsByInsured } from "../../adapters/dynamodb.js";

/**
 * Global HTTP Headers standard enforcing secure JSON transmissions
 */
const HTTP_HEADERS = {
  "Content-Type": "application/json",
};

/**
 * Synchronous AWS Lambda Handler facing API Gateway for Appointment Query.
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Extract the dynamic path parameter securely from the request context
    const insuredId = event.pathParameters?.insuredId;

    // 2. Guard against missing or null path inputs at the network boundary
    if (!insuredId) {
      return {
        statusCode: 400,
        headers: HTTP_HEADERS,
        body: JSON.stringify({ message: "Missing required 'insuredId' path parameter." }),
      };
    }

    // Optional business rule validation: Insured IDs must adhere to the 5-digit format
    const isFiveDigitNumeric = /^\d{5}$/.test(insuredId);
    if (!isFiveDigitNumeric) {
      return {
        statusCode: 400,
        headers: HTTP_HEADERS,
        body: JSON.stringify({
          message: "Invalid 'insuredId' format. Must be a 5-digit numeric string.",
        }),
      };
    }

    // Invoke pure domain logic, injecting the physical DynamoDB document client query port
    const appointments = await getAppointmentsUseCase(insuredId, {
      getAppointmentsByInsured,
    });

    // 5. Return the read-only collection with a successful HTTP 200 OK status
    return {
      statusCode: 200,
      headers: HTTP_HEADERS,
      body: JSON.stringify({
        count: appointments.length,
        data: appointments,
      }),
    };
  } catch (error) {
    console.error("Query Handler Critical Failure:", error);
    return {
      statusCode: 500,
      headers: HTTP_HEADERS,
      body: JSON.stringify({ message: "Internal Server Error." }),
    };
  }
};
