import { z } from "zod";

/**
 * Schema de validación para campos enviados.
 */
export const CreateAppointmentSchema = z.object({
  insuredId: z
    .string()
    .length(5, { message: "El insuredId debe tener exactamente 5 caracteres." })
    .regex(/^\d+$/, { message: "El insureId debe contener solo números." }),

  scheduleId: z
    .number({ required_error: "El scheduledId es obligatorio." })
    .int({ message: "El scheduledId debe ser un número entero" })
    .positive({ message: "El scheduledId debe ser un número positivo" }),

  countryISO: z.enum(["PE", "CL"], {
    errorMap: () => ({ message: "El countryISO solo puede ser PE (Perú) o CL (Chile)." }),
  }),
});

export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;

/**
 * Schema de validación para ESTADOS: pending - completed
 */

export const AppointmentStatusSchema = z.enum(["pending", "completed"]);

export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>;

/**
 * Modelo de la entidad que se guardará en DynamoDB
 */

export interface AppointmentEntity extends CreateAppointmentInput {
  readonly appointmentId: string;
  readonly status: AppointmentStatus;
  readonly createdAt: string;
}
