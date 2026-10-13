-- Transfer ownership of all public-schema objects to a dedicated role.
-- Usage: psql -v role=bothot_rw -d <db> -f transfer-ownership.sql
\set ON_ERROR_STOP on
SET transfer.role TO :'role';
DO $blk$
DECLARE
  target text := current_setting('transfer.role');
  r RECORD;
BEGIN
  FOR r IN SELECT tablename AS n FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO %I', r.n, target);
  END LOOP;
  FOR r IN SELECT sequencename AS n FROM pg_sequences WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER SEQUENCE public.%I OWNER TO %I', r.n, target);
  END LOOP;
  FOR r IN SELECT t.typname AS n FROM pg_type t JOIN pg_namespace ns ON t.typnamespace = ns.oid
            WHERE ns.nspname = 'public' AND t.typtype = 'e' LOOP
    EXECUTE format('ALTER TYPE public.%I OWNER TO %I', r.n, target);
  END LOOP;
  FOR r IN SELECT relname AS n FROM pg_class c JOIN pg_namespace ns ON c.relnamespace = ns.oid
            WHERE ns.nspname = 'public' AND c.relkind = 'S' LOOP
    EXECUTE format('ALTER SEQUENCE public.%I OWNER TO %I', r.n, target);
  END LOOP;
END
$blk$;
GRANT ALL ON SCHEMA public TO :role;
