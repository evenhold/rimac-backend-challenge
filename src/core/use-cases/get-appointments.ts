import type { AppointmentEntity } from "../types/appointment.types.js";

/**
 * Port Contract (Structural Boundary)
 * Defines the functional signature that the DynamoDB adapter must satisfy.
 */
export type GetAppointmentsByInsuredPort = (
  insuredId: string,
) => Promise<readonly AppointmentEntity[]>;

/**
 * Dependencies Interface
 * Packages the required query port following the dependency inversion principle.
 */
interface GetAppointmentsDependencies {
  readonly getAppointmentsByInsured: GetAppointmentsByInsuredPort;
}

/**
 * Use-Case Flow Query Orchestrato
 */
export const getAppointmentsUseCase = async (
  insuredId: string,
  { getAppointmentsByInsured }: GetAppointmentsDependencies,
): Promise<readonly AppointmentEntity[]> => {
  // Execute the database retrieval side effect through the injected functional port
  return await getAppointmentsByInsured(insuredId);
};
