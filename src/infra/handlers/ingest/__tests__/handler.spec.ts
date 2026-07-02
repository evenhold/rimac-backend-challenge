import type { APIGatewayProxyEvent } from "aws-lambda";
import { beforeEach, describe, expect, test, vi } from "vitest";
import * as createAppointmentModule from "../../../../core/use-cases/create-appointment.js";
import { handler } from "../handler.js";

describe("Infrastructure Layer - Ingest Lambda Handler", () => {
  const useCaseSpy = vi.spyOn(createAppointmentModule, "createAppointmentUseCase");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return 201 and successfully create an appointment when payload is valid", async () => {
    // 1. Arrange
    const mockPayload = {
      insuredId: "00123",
      scheduleId: 45,
      countryISO: "PE" as const,
    };

    const mockEvent = {
      body: JSON.stringify(mockPayload),
    } as unknown as APIGatewayProxyEvent;

    const mockResultEntity = {
      ...mockPayload,
      appointmentId: "mock-uuid-v4-token",
      status: "pending" as const,
      createdAt: "2026-07-02T00:00:00.000Z",
    };

    // Force the spy mock resolution cleanly
    useCaseSpy.mockResolvedValueOnce(mockResultEntity);

    // 2. Act
    const response = await handler(mockEvent);

    // 3. Assert
    expect(response.statusCode).toBe(201);
    expect(response.headers).toEqual({ "Content-Type": "application/json" });

    const parsedBody = JSON.parse(response.body);
    expect(parsedBody.message).toBe("Appointment created successfully and queued for processing.");
    expect(parsedBody.data).toEqual(mockResultEntity);

    expect(useCaseSpy).toHaveBeenCalledTimes(1);
  });

  test("should return 400 Bad Request when request body is missing", async () => {
    // 1. Arrange
    const mockEvent = {
      body: null,
    } as unknown as APIGatewayProxyEvent;

    // 2. Act
    const response = await handler(mockEvent);

    // 3. Assert
    expect(response.statusCode).toBe(400);
    const parsedBody = JSON.parse(response.body);
    expect(parsedBody.message).toBe("Missing request body payload.");
    expect(useCaseSpy).not.toHaveBeenCalled();
  });

  test("should return 400 Bad Request when validation schema constraints fail", async () => {
    // 1. Arrange
    const mockPayload = {
      insuredId: "12A",
      scheduleId: -5,
      countryISO: "AR",
    };

    const mockEvent = {
      body: JSON.stringify(mockPayload),
    } as unknown as APIGatewayProxyEvent;

    // 2. Act
    const response = await handler(mockEvent);

    // 3. Assert
    expect(response.statusCode).toBe(400);
    const parsedBody = JSON.parse(response.body);
    expect(parsedBody.message).toBe("Validation Error");
    expect(parsedBody.errors).toBeDefined();
    expect(useCaseSpy).not.toHaveBeenCalled();
  });

  test("should return 500 Internal Server Error when downstream dependencies fail abruptly", async () => {
    // 1. Arrange
    const mockPayload = {
      insuredId: "00123",
      scheduleId: 45,
      countryISO: "PE" as const,
    };

    const mockEvent = {
      body: JSON.stringify(mockPayload),
    } as unknown as APIGatewayProxyEvent;

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    useCaseSpy.mockRejectedValueOnce(new Error("Critical cluster breakdown"));

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
