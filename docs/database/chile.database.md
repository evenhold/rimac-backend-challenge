# # Chile Relational Database Provisioning Guide (PostgreSQL 17)

This document provides the single source of truth for initializing the regional schema, user permissions, and structural tables inside the containerized PostgreSQL instance for Chile.

---

## Target Core Schema

The application layers utilize a dedicated logical namespace called **`sch_core`** to isolate medical appointment logs from default configuration tables.

## Immediate Container Execution Shortcut

To provision the running Docker container in development environment with a single command line shell execution, paste the following command directly inside your Linux host terminal:

```bash
docker exec -i rimac_challenge_postgres_cl psql -U "<POSTGRES_CL_USER>" -d "<POSTGRES_CL_DATABASE>" -c "
CREATE SCHEMA IF NOT EXISTS sch_core;

SET search_path TO sch_core;

CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    appointment_id VARCHAR(36) NOT NULL UNIQUE,
    insured_id VARCHAR(5) NOT NULL,
    schedule_id INT NOT NULL,
    created_at VARCHAR(30) NOT NULL
);"
```

---

## Data Agreement Sizing Matrix

| Column Name        | Data Type     | Constraint Keys   | Purpose / Domain Map                  |
| :----------------- | :------------ | :---------------- | :------------------------------------ |
| **id**             | `SERIAL`      | `PRIMARY KEY`     | Internal relational serial tracker    |
| **appointment_id** | `VARCHAR(36)` | `NOT NULL UNIQUE` | Domain UUID correlation identifier    |
| **insured_id**     | `VARCHAR(5)`  | `NOT NULL`        | String policyholder identifier shield |
| **schedule_id**    | `INT`         | `NOT NULL`        | Primary medical schedule pointer      |
| **created_at**     | `VARCHAR(30)` | `NOT NULL`        | ISO 8601 string network timestamp     |
