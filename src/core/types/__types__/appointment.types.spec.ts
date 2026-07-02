import { describe, expect, test } from "vitest";
import { CreateAppointmentSchema } from "../appointment.types.js";

describe("Core domain - CreateAppointmentSchema validation", () => {
  test("Should accept a completely valid payload with countryISO PE", () => {
    const validPayload = {
      insuredId: "00123",
      scheduledId: 45,
      countryISO: "PE",
    };

    const result = CreateAppointmentSchema.safeParse(validPayload);

    expect(result.success).toBe(true);
  });

  test("Should accept a completely valid payload with countryISO CL", () => {
    const validPayload = {
      insuredId: "00123",
      scheduledId: 45,
      countryISO: "CL",
    };

    const result = CreateAppointmentSchema.safeParse(validPayload);

    expect(result.success).toBe(true);
  });

  test("should reject if insuredId has less than 5 digits", () => {
    const invalidPayload = {
      insuredId: "123",
      scheduleId: 45,
      countryISO: "PE",
    };

    const result = CreateAppointmentSchema.safeParse(invalidPayload);

    expect(result.success).toBe(false);
    if (!result.success) {
      const errorMessages = result.error.format().insuredId?._errors;
      expect(errorMessages).toContain("El insuredId debe tener exactamente 5 caracteres.");
    }
  });

  test("should reject if insuredId contains non-numeric characters", () => {
    const invalidPayload = {
      insuredId: "0012A",
      scheduleId: 45,
      countryISO: "PE",
    };

    const result = CreateAppointmentSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  // --- SCHEDULE_ID VALIDATIONS ---
  test("should reject if scheduleId is not an integer number", () => {
    const invalidPayload = {
      insuredId: "00123",
      scheduleId: 45.5,
      countryISO: "PE",
    };

    const result = CreateAppointmentSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  // --- COUNTRY_ISO VALIDATIONS ---
  test("should reject if countryISO belongs to an unauthorized country", () => {
    const invalidPayload = {
      insuredId: "00123",
      scheduleId: 45,
      countryISO: "AR",
    };

    const result = CreateAppointmentSchema.safeParse(invalidPayload);

    expect(result.success).toBe(false);
  });
});
