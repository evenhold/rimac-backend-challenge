import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import type { AppointmentEntity } from "../../core/types/appointment.types.js";

const snsClient = new SNSClient({
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.SNS_ENDPOINT || "http://localhost:4566",
});

const topicArn =
  process.env.SNS_TOPIC_ARN ||
  "arn:aws:sns:us-east-1:000000000000:rimac-backend-challenge-events-topic-dev";

export const publishAppointmentEvent = async (appointment: AppointmentEntity): Promise<void> => {
  await snsClient.send(
    new PublishCommand({
      TopicArn: topicArn,
      Message: JSON.stringify(appointment),
      // MessageAttributes are evaluated by SNS subscription filters (FilterPolicy)
      MessageAttributes: {
        countryISO: {
          DataType: "String",
          StringValue: appointment.countryISO, // Encapsulates "PE" or "CL" to trigger cloud-level routing
        },
      },
    }),
  );
};
