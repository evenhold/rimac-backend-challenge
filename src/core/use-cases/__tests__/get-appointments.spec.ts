import { describe, expect, test, vi } from "vitest";
import type { AppointmentEntity } from "../../types/appointment.types.js";
import { getAppointmentsUseCase } from "../get-appointments.js";

describe("Core Domain - GetAppointments Use Case", () => {
  test("should successfully retrieve a list of appointments via the injected query port", async () => {
    // 1. Arrange: Prepare target parameter and mock collection row data
    const targetInsuredId = "00123";
    const mockCollection: AppointmentEntity[] = [
      {
        insuredId: "00123",
        appointmentId: "uuid-token-abc-1",
        scheduleId: 45,
        countryISO: "PE",
        status: "completed",
        createdAt: "2026-07-02T00:00:00.000Z",
      },
      {
        insuredId: "00123",
        appointmentId: "uuid-token-abc-2",
        scheduleId: 102,
        countryISO: "PE",
        status: "pending",
        createdAt: "2026-07-02T01:00:00.000Z",
      },
    ];

    const getAppointmentsByInsuredSpy = vi.fn().mockResolvedValue(mockCollection);
    const dependencies = { getAppointmentsByInsured: getAppointmentsByInsuredSpy };

    // 2. Act: Invoke the functional query orchestrator
    const result = await getAppointmentsUseCase(targetInsuredId, dependencies);

    // 3. Assert: Verify data mapping and port execution integration
    expect(result).toBeDefined();
    expect(result).toHaveLength(2);
    expect(result).toEqual(mockCollection);

    expect(getAppointmentsByInsuredSpy).toHaveBeenCalledTimes(1);
    expect(getAppointmentsByInsuredSpy).toHaveBeenCalledWith(targetInsuredId);
  });

  test("should return an empty collection array if the query port finds no matches", async () => {
    // 1. Arrange: Target a policyholder without history
    const emptyInsuredId = "99999";
    const getAppointmentsByInsuredSpy = vi.fn().mockResolvedValue([]);
    const dependencies = { getAppointmentsByInsured: getAppointmentsByInsuredSpy };

    // 2. Act
    const result = await getAppointmentsUseCase(emptyInsuredId, dependencies);

    // 3. Assert
    expect(result).toEqual([]);
    expect(getAppointmentsByInsuredSpy).toHaveBeenCalledTimes(1);
    expect(getAppointmentsByInsuredSpy).toHaveBeenCalledWith(emptyInsuredId);
  });
});
