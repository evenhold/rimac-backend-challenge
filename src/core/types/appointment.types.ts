import { z } from "zod";

/**
 * Schema de validación para campos enviados.
 */
export const CreateAppointmentSchema = z.object({
  insuredId: z
    .string()
    .length(5, { message: "The insuredId must be exactly 5 characters long." })
    .regex(/^\d+$/, { message: "The insuredId must contain numbers only." }),

  scheduleId: z
    .number({ required_error: "The scheduleId is required." })
    .int({ message: "The scheduleId must be an integer number." })
    .positive({ message: "The scheduleId must be a positive number." }),

  countryISO: z.enum(["PE", "CL"], {
    errorMap: () => ({ message: "The countryISO must be either 'PE' (Peru) or 'CL' (Chile)." }),
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
