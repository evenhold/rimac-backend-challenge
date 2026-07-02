import { PublishCommand } from "@aws-sdk/client-sns";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { AppointmentEntity } from "../../../core/types/appointment.types.js";
import { publishAppointmentEvent } from "../sns.js";

// --- MOCKING AWS SDK v3 SNS CLIENT ---
const mockSend = vi.fn();

vi.mock("@aws-sdk/client-sns", async (importOriginal) => {
  const original = await importOriginal<typeof import("@aws-sdk/client-sns")>();
  return {
    ...original,
    SNSClient: vi.fn().mockImplementation(() => ({
      send: (...args: unknown[]) => mockSend(...args),
    })),
  };
});

describe("Infrastructure Layer - SNS Adapter", () => {
  beforeEach(() => {
    mockSend.mockClear();
  });

  test("should successfully construct and send a PublishCommand with correct geographical attributes", async () => {
    // 1. Arrange
    const mockAppointment: AppointmentEntity = {
      insuredId: "00123",
      appointmentId: "uuid-token-777",
      scheduleId: 101,
      countryISO: "PE",
      status: "pending",
      createdAt: "2026-07-02T00:00:00.000Z",
    };

    mockSend.mockResolvedValueOnce({ MessageId: "msg-id-123" });

    // 2. Act
    await publishAppointmentEvent(mockAppointment);

    // 3. Assert
    expect(mockSend).toHaveBeenCalledTimes(1);

    // Extract the exact PublishCommand instance passed to the client wrapper
    const sentCommand = mockSend.mock.calls[0][0];
    expect(sentCommand).toBeInstanceOf(PublishCommand);

    // Validate that the inner payload maps correctly to a stringified JSON
    expect(sentCommand.input.Message).toBe(JSON.stringify(mockAppointment));

    // Critical Assertion: Enforce that geographic routing attributes exist for cloud-level filtering
    expect(sentCommand.input.MessageAttributes).toEqual({
      countryISO: {
        DataType: "String",
        StringValue: "PE",
      },
    });
  });
});
