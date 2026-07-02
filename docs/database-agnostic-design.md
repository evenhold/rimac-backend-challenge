# Database Agnostic Contract Design

This document explains the technical implementation of our type-safe and database-agnostic relational layer using **Kysely** over **Node.js 24+**.

## Conceptual Separation

In accordance with **Clean Architecture** principles, the database row definitions are decoupled from the physical database engines and connection details:

1. **`db.schema.ts` (The Contract):** Dictates only the shape, fields, and constraints of our tables at the compile-time level using TypeScript types.
2. **Infrastructure Layer (The Drivers):** Manages connection pools, parameters, and network targets.

---

## ⚡ The Role of `AppointmentsTable`

```typescript
export interface AppointmentsTable {
  readonly id: Generated<number>;
  readonly appointment_id: string;
  readonly insured_id: string;
  readonly schedule_id: number;
  readonly created_at: Generated<string>;
}
```

### Key Architectural Technicalities:

- **The `Generated<T>` Wrapper:** Kysely uses this special type to understand that these columns are managed automatically by the database engines upon insertion.
  - In **MySQL (Peru Worker)**: It translates seamlessly to an `INT AUTO_INCREMENT` data type.
  - In **PostgreSQL (Chile Worker)**: It maps natively to a `SERIAL` or `GENERATED ALWAYS AS IDENTITY` type.
- **Traceability Over Engines:** The `appointment_id` stores the string UUID produced during the initial **DynamoDB** ingestion phase, enforcing complete cross-database auditability.

---

## Why Database Schemas (like `sch_core`) Are Omitted Here

It is a best practice to keep **physical database names or engine-specific search schemas** out of the TypeScript interface definition for the following reasons:

1. **Engine Polimorphism:** MySQL treats schemas as logical database names, while PostgreSQL uses multiple schema namespaces inside a single database. Hardcoding a namespace here breaks code reuse across countries.
2. **Connection Injection:** Target routing is solved purely at the infrastructure layer:
   - **MySQL** defines its scope via the initial connection pool database parameter (e.g., `medical_pe_db`).
   - **PostgreSQL** handles it during pool initialization by configuring a fallback parameter or executing an immediate `SET search_path TO sch_core` hook.
