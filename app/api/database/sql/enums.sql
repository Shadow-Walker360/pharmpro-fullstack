-- ============================================================================
-- PharmPro Enterprise Database
-- Database Enums
--
-- PostgreSQL native ENUM types.
-- Used by stored procedures, reporting, triggers and integrations.
-- ============================================================================

BEGIN;

--------------------------------------------------------
-- User Roles
--------------------------------------------------------

CREATE TYPE user_role AS ENUM (

'SUPER_ADMIN',

'ADMIN',

'PHARMACIST',

'DOCTOR',

'CASHIER',

'ACCOUNTANT',

'STORE_MANAGER',

'LAB_TECHNICIAN',

'RECEPTIONIST'

);

--------------------------------------------------------
-- User Status
--------------------------------------------------------

CREATE TYPE user_status AS ENUM (

'ACTIVE',

'PENDING',

'SUSPENDED',

'LOCKED',

'DISABLED'

);

--------------------------------------------------------
-- Gender
--------------------------------------------------------

CREATE TYPE gender_type AS ENUM (

'MALE',

'FEMALE',

'OTHER'

);

--------------------------------------------------------
-- Payment Method
--------------------------------------------------------

CREATE TYPE payment_method AS ENUM (

'CASH',

'MPESA',

'CARD',

'BANK_TRANSFER',

'CHEQUE',

'INSURANCE',

'CREDIT'

);

--------------------------------------------------------
-- Sale Status
--------------------------------------------------------

CREATE TYPE sale_status AS ENUM (

'PENDING',

'PROCESSING',

'COMPLETED',

'CANCELLED',

'REFUNDED'

);

--------------------------------------------------------
-- Purchase Status
--------------------------------------------------------

CREATE TYPE purchase_status AS ENUM (

'DRAFT',

'ORDERED',

'PARTIALLY_RECEIVED',

'RECEIVED',

'CANCELLED'

);

--------------------------------------------------------
-- Prescription Status
--------------------------------------------------------

CREATE TYPE prescription_status AS ENUM (

'DRAFT',

'PENDING',

'VERIFIED',

'DISPENSING',

'COMPLETED',

'CANCELLED'

);

--------------------------------------------------------
-- Inventory Movement
--------------------------------------------------------

CREATE TYPE inventory_movement AS ENUM (

'PURCHASE',

'SALE',

'TRANSFER',

'RETURN',

'EXPIRED',

'DAMAGED',

'ADJUSTMENT',

'INITIAL_STOCK'

);

--------------------------------------------------------
-- Claim Status
--------------------------------------------------------

CREATE TYPE claim_status AS ENUM (

'DRAFT',

'SUBMITTED',

'UNDER_REVIEW',

'APPROVED',

'PARTIALLY_APPROVED',

'REJECTED',

'PAID',

'APPEALED',

'CANCELLED'

);

--------------------------------------------------------
-- Audit Action
--------------------------------------------------------

CREATE TYPE audit_action AS ENUM (

'CREATE',

'UPDATE',

'DELETE',

'LOGIN',

'LOGOUT',

'IMPORT',

'EXPORT',

'PRINT',

'RESTORE',

'APPROVE',

'REJECT'

);

--------------------------------------------------------
-- Notification Channel
--------------------------------------------------------

CREATE TYPE notification_channel AS ENUM (

'IN_APP',

'EMAIL',

'SMS',

'PUSH',

'WHATSAPP',

'WEBHOOK'

);

--------------------------------------------------------
-- Notification Status
--------------------------------------------------------

CREATE TYPE notification_status AS ENUM (

'QUEUED',

'SENDING',

'SENT',

'FAILED',

'READ'

);

--------------------------------------------------------
-- Backup Status
--------------------------------------------------------

CREATE TYPE backup_status AS ENUM (

'RUNNING',

'COMPLETED',

'FAILED'

);

--------------------------------------------------------
-- Plugin Status
--------------------------------------------------------

CREATE TYPE plugin_status AS ENUM (

'INSTALLED',

'DISABLED',

'UPDATING',

'FAILED'

);

--------------------------------------------------------
-- Synchronization Status
--------------------------------------------------------

CREATE TYPE sync_status AS ENUM (

'PENDING',

'SYNCING',

'SUCCESS',

'FAILED',

'CONFLICT'

);

--------------------------------------------------------
-- AI Job Status
--------------------------------------------------------

CREATE TYPE ai_job_status AS ENUM (

'QUEUED',

'RUNNING',

'COMPLETED',

'FAILED'

);

COMMIT;