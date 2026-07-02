import type { SQSBatchResponse, SQSEvent } from "aws-lambda";
import { createKyselyClient } from "../../adapters/database/kysely.client.js";

/**
 * Types
 */
interface AppointmentSnsPayload {
  insuredId: string;
  appointmentId: string;
  scheduleId: number;
  createdAt: string;
}

/**
 * Asynchronous Worker Lambda Handler consuming from SQS_PE.
 */
export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const batchItemFailures: { itemIdentifier: string }[] = [];

  const db = createKyselyClient({ countryISO: "PE" });

  for (const record of event.Records) {
    try {
      const sqsBody = JSON.parse(record.body);

      const appointment: AppointmentSnsPayload = JSON.parse(sqsBody.Message);

      console.log(
        `[Worker-PE] Processing transactional insert for Appointment: ${appointment.appointmentId}`,
      );

      // Execute atomic relational persistence using compile-time type agreements
      await db
        .insertInto("sch_core.appointments")
        .values({
          appointment_id: appointment.appointmentId,
          insured_id: appointment.insuredId,
          schedule_id: appointment.scheduleId,
          created_at: appointment.createdAt,
        })
        .execute();

      console.log(
        `[Worker-PE] Successfully persisted record inside MySQL for ID: ${appointment.appointmentId}`,
      );
    } catch (error) {
      console.error(
        `[Worker-PE] Critical record processing collapse for message ${record.messageId}:`,
        error,
      );
      // Track failures to leverage automated SQS retry loops and redrive DLQ policies
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};
