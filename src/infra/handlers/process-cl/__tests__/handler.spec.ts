import type { SQSEvent } from "aws-lambda";
import { beforeEach, describe, expect, test, vi } from "vitest";
import * as kyselyClientModule from "../../../adapters/database/kysely.client.js";
import { handler } from "../handler.js";

vi.mock("@aws-sdk/client-eventbridge", () => {
  return {
    EventBridgeClient: vi.fn().mockImplementation(() => {
      return {
        send: vi
          .fn()
          .mockResolvedValue({ FailedEntryCount: 0, Entries: [{ EventId: "mock-eb-id" }] }),
      };
    }),
    PutEventsCommand: vi.fn().mockImplementation((args) => args),
  };
});

describe("Infrastructure Layer - Asynchronous Chile Worker Lambda", () => {
  // Mock tracking containers for Kysely chain parameters
  const mockInsert = vi.fn().mockReturnThis();
  const mockValues = vi.fn().mockReturnThis();
  const mockExecute = vi.fn();

  const mockDbClient = {
    insertInto: mockInsert,
    values: mockValues,
    execute: mockExecute,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Intercept database engine routing factory calls
    vi.spyOn(kyselyClientModule, "createKyselyClient").mockReturnValue(mockDbClient as any);
  });

  test("should process batches successfully and write records directly to MySQL", async () => {
    // 1. Arrange: Formulate mock stringified SNS notification structure wrapped in SQS
    const mockSnsEnvelope = JSON.stringify({
      Type: "Notification",
      Message: JSON.stringify({
        insuredId: "00123",
        appointmentId: "uuid-cl-99",
        scheduleId: 101,
        createdAt: "2026-07-02T12:00:00.000Z",
      }),
    });

    const mockEvent = {
      Records: [
        {
          messageId: "msg-id-1",
          body: mockSnsEnvelope,
        },
      ],
    } as unknown as SQSEvent;

    mockExecute.mockResolvedValueOnce([]);

    // 2. Act
    const result = await handler(mockEvent);

    // 3. Assert
    expect(result.batchItemFailures).toHaveLength(0);
    expect(mockInsert).toHaveBeenCalledWith("appointments");
    expect(mockValues).toHaveBeenCalledWith({
      appointment_id: "uuid-cl-99",
      insured_id: "00123",
      schedule_id: 101,
      created_at: "2026-07-02T12:00:00.000Z",
    });
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  test("should catch internal execution panic errors and return failed message ID identifiers", async () => {
    // 1. Arrange: Intentionally feed a completely corrupt JSON payload topology
    const mockEvent = {
      Records: [
        {
          messageId: "broken-msg-101",
          body: "{ invalid json ...",
        },
      ],
    } as unknown as SQSEvent;

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // 2. Act
    const result = await handler(mockEvent);

    // 3. Assert
    expect(result.batchItemFailures).toHaveLength(1);
    expect(result.batchItemFailures[0].itemIdentifier).toBe("broken-msg-101");
    expect(mockExecute).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledTimes(1);

    consoleSpy.mockRestore();
  });
});
