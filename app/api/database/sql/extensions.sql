-- =====================================================================
-- PharmPro Enterprise Database
-- PostgreSQL Extensions
--
-- This file enables all PostgreSQL extensions required by the platform.
-- Safe to execute multiple times.
-- =====================================================================

BEGIN;

--------------------------------------------------------
-- UUID Generation
--------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

--------------------------------------------------------
-- Modern Cryptography
--------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto;

--------------------------------------------------------
-- Case-insensitive text
--------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS citext;

--------------------------------------------------------
-- Fast Full-text Search
--------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_trgm;

--------------------------------------------------------
-- JSON indexing
--------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS btree_gin;

--------------------------------------------------------
-- GiST enhancements
--------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS btree_gist;

--------------------------------------------------------
-- Hierarchical structures
--------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS ltree;

--------------------------------------------------------
-- Key-Value storage
--------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS hstore;

--------------------------------------------------------
-- Query statistics
--------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

--------------------------------------------------------
-- UUID utilities
--------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

--------------------------------------------------------
-- Optional Scheduling
--------------------------------------------------------

-- CREATE EXTENSION IF NOT EXISTS pg_cron;

--------------------------------------------------------
-- Optional Time Series
--------------------------------------------------------

-- CREATE EXTENSION IF NOT EXISTS timescaledb;

COMMIT;