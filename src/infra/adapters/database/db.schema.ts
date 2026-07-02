import type { Generated } from "kysely";

/**
 * Interface representing the structure of the appointments.
 * This Shape maps perfectly to Both MySQL and PostgreSQL database.
 */

export interface AppointmentsTable {
  readonly id: Generated<number>;
  readonly appointment_id: string;
  readonly insured_id: string;
  readonly schedule_id: number;
  readonly created_at: Generated<string>;
}

/**
 * The unified database contract.
 */

export interface Database {
  readonly "sch_core.appointments": AppointmentsTable;
}
