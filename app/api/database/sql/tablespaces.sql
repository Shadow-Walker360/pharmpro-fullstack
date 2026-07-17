-- ============================================================================
-- PharmPro Enterprise Database
-- Tablespaces
--
-- NOTE:
-- These statements are examples for production deployments.
-- Tablespace locations must exist on the database server.
-- Skip this file for local development unless dedicated storage exists.
-- ============================================================================

BEGIN;

-- ============================================================================
-- HOT TRANSACTIONAL DATA
-- ============================================================================

-- CREATE TABLESPACE pharmpro_core
-- LOCATION '/data/postgresql/core';

-- ============================================================================
-- ANALYTICS
-- ============================================================================

-- CREATE TABLESPACE pharmpro_analytics
-- LOCATION '/data/postgresql/analytics';

-- ============================================================================
-- AUDIT
-- ============================================================================

-- CREATE TABLESPACE pharmpro_audit
-- LOCATION '/data/postgresql/audit';

-- ============================================================================
-- ARCHIVE
-- ============================================================================

-- CREATE TABLESPACE pharmpro_archive
-- LOCATION '/data/postgresql/archive';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- CREATE TABLESPACE pharmpro_indexes
-- LOCATION '/data/postgresql/indexes';

COMMIT;

-- ============================================================================
-- Example Usage
-- ============================================================================

-- ALTER TABLE clinical."Patient"
-- SET TABLESPACE pharmpro_core;

-- ALTER TABLE audit."AuditLog"
-- SET TABLESPACE pharmpro_audit;

-- ALTER TABLE analytics."Forecast"
-- SET TABLESPACE pharmpro_analytics;