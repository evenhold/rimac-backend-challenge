import { describe, expect, test, vi } from "vitest";
import type { CreateAppointmentInput } from "../../types/appointment.types.js";
import { createAppointmentUseCase } from "../create-appointment.js";

describe("Core Domain - CreateAppointment Use Case", () => {
  test("should successfully orchestrate the appointment creation lifecycle sequentially", async () => {
    // 1. Arrange: Prepare valid input payload and native functional spy ports
    const mockInput: CreateAppointmentInput = {
      insuredId: "00123",
      scheduleId: 45,
      countryISO: "PE",
    };

    const saveAppointmentSpy = vi.fn().mockResolvedValue(undefined);
    const publishEventSpy = vi.fn().mockResolvedValue(undefined);

    const dependencies = {
      saveAppointment: saveAppointmentSpy,
      publishEvent: publishEventSpy,
    };

    // 2. Act: Invoke the functional core orchestrator
    const result = await createAppointmentUseCase(mockInput, dependencies);

    // 3. Assert: Verify structural metadata generation
    expect(result).toBeDefined();
    expect(result.insuredId).toBe(mockInput.insuredId);
    expect(result.scheduleId).toBe(mockInput.scheduleId);
    expect(result.countryISO).toBe(mockInput.countryISO);

    // Validate system fields auto-generation
    expect(result.status).toBe("pending");
    expect(result.appointmentId).toBeTypeOf("string");
    expect(result.appointmentId).toHaveLength(36); // Length of a standard UUID v4 token
    expect(result.createdAt).toBeTypeOf("string");
    expect(() => new Date(result.createdAt).toISOString()).not.toThrow();

    // Validate sequential execution order and dependencies integration
    expect(saveAppointmentSpy).toHaveBeenCalledTimes(1);
    expect(saveAppointmentSpy).toHaveBeenCalledWith(result);

    expect(publishEventSpy).toHaveBeenCalledTimes(1);
    expect(publishEventSpy).toHaveBeenCalledWith(result);
  });

  test("should halt execution abruptly and skip publishing if the persistence port fails", async () => {
    // 1. Arrange: Force the persistence port to throw an error
    const mockInput: CreateAppointmentInput = {
      insuredId: "99999",
      scheduleId: 102,
      countryISO: "CL",
    };

    const dbError = new Error("DynamoDB storage layer failure or throttling");
    const saveAppointmentSpy = vi.fn().mockRejectedValue(dbError);
    const publishEventSpy = vi.fn().mockResolvedValue(undefined);

    const dependencies = {
      saveAppointment: saveAppointmentSpy,
      publishEvent: publishEventSpy,
    };

    // 2. Act & Assert: Verify transaction boundary enforcement
    await expect(createAppointmentUseCase(mockInput, dependencies)).rejects.toThrow(
      "DynamoDB storage layer failure or throttling",
    );

    // Critical Architecture Assertion: Messaging channel must never trigger if persistence fails
    expect(saveAppointmentSpy).toHaveBeenCalledTimes(1);
    expect(publishEventSpy).not.toHaveBeenCalled();
  });
});
