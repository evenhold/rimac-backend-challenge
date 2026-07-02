import crypto from "node:crypto";
import type { AppointmentEntity, CreateAppointmentInput } from "../types/appointment.types.js";

/**
 * Types
 */
export type SaveAppointmentPort = (appointment: AppointmentEntity) => Promise<void>;
export type PublishAppointmentEventPort = (appointment: AppointmentEntity) => Promise<void>;

interface CreateAppointmentDependencies {
  readonly saveAppointment: SaveAppointmentPort;
  readonly publishEvent: PublishAppointmentEventPort;
}

/**
 * Use-Case Flow Orchestrator
 */
export const createAppointmentUseCase = async (
  input: CreateAppointmentInput,
  { saveAppointment, publishEvent }: CreateAppointmentDependencies,
): Promise<AppointmentEntity> => {
  const appointment: AppointmentEntity = {
    ...input,
    appointmentId: crypto.randomUUID(),
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  await saveAppointment(appointment); // Guardamos en la base de datos de DynamoDB
  await publishEvent(appointment); // Enviamos evento a SNS

  return appointment;
};
