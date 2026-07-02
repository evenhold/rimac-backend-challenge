import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { AppointmentEntity } from "../../core/types/appointment.types.js";

const rawClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.DYNAMODB_ENDPOINT || "http://localhost:4566",
});

const docClient = DynamoDBDocumentClient.from(rawClient);

const tableName = process.env.DYNAMODB_TABLE || "rimac-backend-challenge-appointments-dev";

export const saveAppointmentState = async (appointment: AppointmentEntity): Promise<void> => {
  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        insuredId: appointment.insuredId,
        appointmentId: appointment.appointmentId,
        scheduleId: appointment.scheduleId,
        countryISO: appointment.countryISO,
        status: appointment.status,
        createdAt: appointment.createdAt,
      },
    }),
  );
};

export const getAppointmentsByInsured = async (
  insuredId: string,
): Promise<readonly AppointmentEntity[]> => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "insuredId = :insuredId",
      ExpressionAttributeValues: {
        ":insuredId": insuredId,
      },
    }),
  );

  return (result.Items as AppointmentEntity[]) || [];
};
