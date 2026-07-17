-- ============================================================================
-- PharmPro Enterprise Database
-- Database Schemas
--
-- Every module owns its own schema.
-- This keeps permissions, backups, auditing and migrations isolated.
-- ============================================================================

BEGIN;

-- ============================================================================
-- Identity & Authentication
-- Users, Roles, Sessions, API Keys
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS identity;

COMMENT ON SCHEMA identity IS
'Authentication, authorization, RBAC, sessions and API access.';


-- ============================================================================
-- Core Platform
-- Branches, System Settings, Tenants
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS core;

COMMENT ON SCHEMA core IS
'Core application entities and shared configuration.';


-- ============================================================================
-- Clinical
-- Patients, Prescriptions, Medical Records
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

COMMENT ON SCHEMA clinical IS
'Clinical operations including patients and prescriptions.';


-- ============================================================================
-- Inventory
-- Drugs, Stock, Suppliers, Purchases
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS inventory;

COMMENT ON SCHEMA inventory IS
'Drug inventory, purchasing and warehouse operations.';


-- ============================================================================
-- Sales
-- POS, Receipts, Transactions
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS sales;

COMMENT ON SCHEMA sales IS
'Sales transactions and point-of-sale operations.';


-- ============================================================================
-- Finance
-- Expenses, Revenue, Accounting
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS finance;

COMMENT ON SCHEMA finance IS
'Financial records, accounting and revenue tracking.';


-- ============================================================================
-- Insurance
-- Claims, Payers, Approvals
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS insurance;

COMMENT ON SCHEMA insurance IS
'Insurance companies, claims and reimbursement workflows.';


-- ============================================================================
-- Analytics
-- Dashboards, KPIs, ML datasets
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS analytics;

COMMENT ON SCHEMA analytics IS
'Business intelligence, forecasting and analytical datasets.';


-- ============================================================================
-- Audit
-- Compliance and forensic logging
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS audit;

COMMENT ON SCHEMA audit IS
'Immutable audit logs and compliance records.';


-- ============================================================================
-- Notifications
-- Email, SMS, Push, Internal Alerts
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS notifications;

COMMENT ON SCHEMA notifications IS
'Notification queues and delivery history.';


-- ============================================================================
-- AI
-- Models, Embeddings, Recommendations
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS ai;

COMMENT ON SCHEMA ai IS
'Artificial Intelligence, embeddings and recommendation engines.';


-- ============================================================================
-- Integration
-- External APIs and Third-party Systems
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS integration;

COMMENT ON SCHEMA integration IS
'Integrations with NHIF, payment gateways, SMS providers and external systems.';


-- ============================================================================
-- Plugins
-- Dynamic modules
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS plugins;

COMMENT ON SCHEMA plugins IS
'Runtime plugins and extension modules.';


-- ============================================================================
-- System
-- Internal infrastructure
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS system;

COMMENT ON SCHEMA system IS
'Database infrastructure, maintenance and platform metadata.';


COMMIT;