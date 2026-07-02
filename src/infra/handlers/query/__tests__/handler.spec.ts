import type { APIGatewayProxyEvent } from "aws-lambda";
import { beforeEach, describe, expect, test, vi } from "vitest";
import * as getAppointmentsModule from "../../../../core/use-cases/get-appointments.js";
import { handler } from "../handler.js";

describe("Infrastructure Layer - Query Lambda Handler", () => {
  const useCaseSpy = vi.spyOn(getAppointmentsModule, "getAppointmentsUseCase");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return 200 and historical rows collection when insuredId parameter is valid", async () => {
    const mockEvent = {
      pathParameters: { insuredId: "00123" },
    } as unknown as APIGatewayProxyEvent;

    const mockCollection = [
      {
        insuredId: "00123",
        appointmentId: "mock-uuid-1",
        scheduleId: 45,
        countryISO: "PE" as const,
        status: "pending" as const,
        createdAt: "2026-07-02T00:00:00.000Z",
      },
    ];

    useCaseSpy.mockResolvedValueOnce(mockCollection);

    // 2. Act
    const response = await handler(mockEvent);

    // 3. Assert
    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({ "Content-Type": "application/json" });

    const parsedBody = JSON.parse(response.body);
    expect(parsedBody.count).toBe(1);
    expect(parsedBody.data).toEqual(mockCollection);
    expect(useCaseSpy).toHaveBeenCalledTimes(1);
    expect(useCaseSpy).toHaveBeenCalledWith("00123", expect.any(Object));
  });

  test("should return 400 Bad Request when insuredId path parameter is missing", async () => {
    // 1. Arrange
    const mockEvent = {
      pathParameters: null,
    } as unknown as APIGatewayProxyEvent;

    // 2. Act
    const response = await handler(mockEvent);

    // 3. Assert
    expect(response.statusCode).toBe(400);
    const parsedBody = JSON.parse(response.body);
    expect(parsedBody.message).toBe("Missing required 'insuredId' path parameter.");
    expect(useCaseSpy).not.toHaveBeenCalled();
  });

  test("should return 400 Bad Request when insuredId violates structural constraints", async () => {
    // 1. Arrange: Send an malformed non-numeric text criteria
    const mockEvent = {
      pathParameters: { insuredId: "ABC99" },
    } as unknown as APIGatewayProxyEvent;

    // 2. Act
    const response = await handler(mockEvent);

    // 3. Assert
    expect(response.statusCode).toBe(400);
    const parsedBody = JSON.parse(response.body);
    expect(parsedBody.message).toBe(
      "Invalid 'insuredId' format. Must be a 5-digit numeric string.",
    );
    expect(useCaseSpy).not.toHaveBeenCalled();
  });

  test("should return 500 Internal Server Error when downstream ports collapse abruptly", async () => {
    // 1. Arrange
    const mockEvent = {
      pathParameters: { insuredId: "99999" },
    } as unknown as APIGatewayProxyEvent;

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    useCaseSpy.mockRejectedValueOnce(new Error("DynamoDB IO cluster read panic"));

    // 2. Act
    const response = await handler(mockEvent);

    // 3. Assert
    expect(response.statusCode).toBe(500);
    const parsedBody = JSON.parse(response.body);
    expect(parsedBody.message).toBe("Internal Server Error.");
    expect(consoleSpy).toHaveBeenCalledTimes(1);

    consoleSpy.mockRestore();
  });
});
