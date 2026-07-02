import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { SQSBatchResponse, SQSEvent } from "aws-lambda";

/**
 * Interface replicating the structural contract of compliance events
 */
interface CompliancePayload {
  insuredId: string;
  appointmentId: string;
}

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const batchItemFailures: { itemIdentifier: string }[] = [];
  const tableName = process.env.DYNAMODB_TABLE || "rimac-backend-challenge-appointments-dev";

  const rawClient = new DynamoDBClient({
    region: process.env.AWS_REGION || "us-east-1",
    endpoint: process.env.DYNAMODB_ENDPOINT || "http://host.docker.internal:4566",
  });
  const ddbDocClient = DynamoDBDocumentClient.from(rawClient);

  for (const record of event.Records) {
    try {
      const sqsBody = JSON.parse(record.body);

      // EventBridge envelopes wrap compliance signals within the 'detail' root property
      const detail: CompliancePayload = sqsBody.detail || JSON.parse(sqsBody.Message);

      console.log(
        `[Worker-Complete] Initiating state mutation to 'completed' for Appointment: ${detail.appointmentId}`,
      );

      // Execute an atomic write update partition lookup expression
      await ddbDocClient.send(
        new UpdateCommand({
          TableName: tableName,
          Key: {
            insuredId: detail.insuredId,
            appointmentId: detail.appointmentId,
          },
          UpdateExpression: "SET #statusAttr = :completedStatus",
          ExpressionAttributeNames: {
            "#statusAttr": "status",
          },
          ExpressionAttributeValues: {
            ":completedStatus": "completed",
          },
        }),
      );

      console.log(
        `[Worker-Complete] Successfully closed lifecycle state in DynamoDB for ID: ${detail.appointmentId}`,
      );
    } catch (error) {
      console.error(
        `[Worker-Complete] Critical lifecycle mutation failure for message ${record.messageId}:`,
        error,
      );
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};
