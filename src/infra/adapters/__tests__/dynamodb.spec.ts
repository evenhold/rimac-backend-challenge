import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { AppointmentEntity } from "../../../core/types/appointment.types.js";
import { getAppointmentsByInsured, saveAppointmentState } from "../dynamodb.js";

// --- MOCKING AWS SDK v3 CLIENT ---
const mockSend = vi.fn();

vi.mock("@aws-sdk/lib-dynamodb", async (importOriginal) => {
  const original = await importOriginal<typeof import("@aws-sdk/lib-dynamodb")>();
  return {
    ...original,
    DynamoDBDocumentClient: {
      from: vi.fn().mockReturnValue({
        send: (...args: unknown[]) => mockSend(...args),
      }),
    },
  };
});

describe("Infrastructure Layer - DynamoDB Adapter", () => {
  // ⚠️ Clear the execution history of the mock before each isolated test pass
  beforeEach(() => {
    mockSend.mockClear();
  });

  test("should successfully construct and send a PutCommand with correct parameters", async () => {
    // 1. Arrange
    const mockAppointment: AppointmentEntity = {
      insuredId: "00123",
      appointmentId: "uuid-v4-token-999",
      scheduleId: 45,
      countryISO: "PE",
      status: "pending",
      createdAt: "2026-07-02T00:00:00.000Z",
    };

    mockSend.mockResolvedValueOnce({});

    // 2. Act
    await saveAppointmentState(mockAppointment);

    // 3. Assert
    expect(mockSend).toHaveBeenCalledTimes(1);

    const sentCommand = mockSend.mock.calls[0][0];
    expect(sentCommand).toBeInstanceOf(PutCommand);
    expect(sentCommand.input.Item).toEqual(mockAppointment);
  });

  test("should successfully construct and send a QueryCommand returning collection rows", async () => {
    // 1. Arrange
    const targetInsuredId = "00123";
    const mockItems: AppointmentEntity[] = [
      {
        insuredId: "00123",
        appointmentId: "uuid-1",
        scheduleId: 10,
        countryISO: "PE",
        status: "pending",
        createdAt: "2026-07-02T00:00:00.000Z",
      },
    ];

    mockSend.mockResolvedValueOnce({ Items: mockItems });

    // 2. Act
    const result = await getAppointmentsByInsured(targetInsuredId);

    // 3. Assert
    expect(mockSend).toHaveBeenCalledTimes(1); // ✅ Ahora pasará limpio gracias a mockClear()

    const sentCommand = mockSend.mock.calls[0][0];
    expect(sentCommand).toBeInstanceOf(QueryCommand);
    expect(sentCommand.input.KeyConditionExpression).toBe("insuredId = :insuredId");
    expect(sentCommand.input.ExpressionAttributeValues).toEqual({
      ":insuredId": targetInsuredId,
    });
    expect(result).toEqual(mockItems);
  });
});
