-- shared-infra init: create per-project databases and users
-- Runs ONLY on first-time PG initialization (empty data dir).
-- For migrations after data import, this file serves as reference.

-- Superuser 'root' is auto-created by POSTGRES_USER env.
-- Create dedicated roles per project (LOGIN + limited to own database).

CREATE ROLE aidean_rw LOGIN PASSWORD 'aidean_rw_2026';
CREATE ROLE bothot_rw LOGIN PASSWORD 'bothot_rw_2026';
CREATE ROLE thesis_rw LOGIN PASSWORD 'thesis_rw_2026';
CREATE ROLE bot_rw LOGIN PASSWORD 'bot_rw_2026';
CREATE ROLE fleet_rw LOGIN PASSWORD 'fleet_rw_2026';

-- aidean database is POSTGRES_DB (auto-created by entrypoint, owned by root).
-- Reassign ownership to aidean_rw for cleaner isolation.
ALTER DATABASE aidean OWNER TO aidean_rw;

-- Create other project databases
CREATE DATABASE bothot OWNER bothot_rw;
CREATE DATABASE aidanthesis OWNER thesis_rw;
CREATE DATABASE aideanbot OWNER bot_rw;
CREATE DATABASE aideanfleet OWNER fleet_rw;

-- Ensure each role can only connect to its own database
REVOKE ALL ON DATABASE aidean FROM PUBLIC;
REVOKE ALL ON DATABASE bothot FROM PUBLIC;
REVOKE ALL ON DATABASE aidanthesis FROM PUBLIC;
REVOKE ALL ON DATABASE aideanbot FROM PUBLIC;
REVOKE ALL ON DATABASE aideanfleet FROM PUBLIC;

GRANT CONNECT ON DATABASE aidean TO aidean_rw;
GRANT CONNECT ON DATABASE bothot TO bothot_rw;
GRANT CONNECT ON DATABASE aidanthesis TO thesis_rw;
GRANT CONNECT ON DATABASE aideanbot TO bot_rw;
GRANT CONNECT ON DATABASE aideanfleet TO fleet_rw;

-- root retains superuser for operational flexibility
