import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { SQSEvent } from "aws-lambda";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { handler } from "../handler.js";

vi.mock("@aws-sdk/lib-dynamodb", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@aws-sdk/lib-dynamodb")>();
  return {
    ...actual,
    DynamoDBDocumentClient: {
      from: vi.fn().mockReturnValue({
        send: vi.fn(),
      }),
    },
    UpdateCommand: vi.fn(),
  };
});

describe("Infrastructure Layer - Asynchronous Lifecycle Closure Lambda", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should consume from SQS_FINAL and mutate target state records to completed inside DynamoDB", async () => {
    const mockSqsPayload = JSON.stringify({
      detail: {
        insuredId: "00123",
        appointmentId: "uuid-closure-77",
      },
    });

    const mockEvent = {
      Records: [
        {
          messageId: "final-msg-abc",
          body: mockSqsPayload,
        },
      ],
    } as unknown as SQSEvent;

    const mockSend = vi.fn().mockResolvedValueOnce({});
    vi.mocked(DynamoDBDocumentClient.from).mockReturnValue({ send: mockSend } as any);

    const result = await handler(mockEvent);

    expect(result.batchItemFailures).toHaveLength(0);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });
});
