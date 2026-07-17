-- ============================================================================
-- PharmPro Enterprise Database
-- Custom Domains
--
-- Reusable enterprise data types.
-- Every table should use these instead of repeating constraints.
-- ============================================================================

BEGIN;

-- ============================================================================
-- EMAIL ADDRESS
-- ============================================================================

CREATE DOMAIN email_address AS CITEXT
CHECK (
    VALUE ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
);

COMMENT ON DOMAIN email_address IS
'Validated case-insensitive email address.';


-- ============================================================================
-- PHONE NUMBER
-- Supports E.164 format
-- +254712345678
-- ============================================================================

CREATE DOMAIN phone_number AS TEXT
CHECK (
    VALUE ~ '^\+[1-9][0-9]{7,14}$'
);

COMMENT ON DOMAIN phone_number IS
'International E.164 phone number.';


-- ============================================================================
-- HUMAN NAME
-- ============================================================================

CREATE DOMAIN person_name AS VARCHAR(150)
CHECK (
    LENGTH(TRIM(VALUE)) >= 2
);

COMMENT ON DOMAIN person_name IS
'Validated human name.';


-- ============================================================================
-- COMPANY NAME
-- ============================================================================

CREATE DOMAIN company_name AS VARCHAR(200)
CHECK (
    LENGTH(TRIM(VALUE)) >= 2
);

COMMENT ON DOMAIN company_name IS
'Registered company or organization name.';


-- ============================================================================
-- MONEY
-- Uses NUMERIC to avoid floating point errors.
-- ============================================================================

CREATE DOMAIN currency_amount AS NUMERIC(18,2)
CHECK (
    VALUE >= 0
);

COMMENT ON DOMAIN currency_amount IS
'Monetary value with two decimal places.';


-- ============================================================================
-- QUANTITY
-- ============================================================================

CREATE DOMAIN stock_quantity AS INTEGER
CHECK (
    VALUE >= 0
);

COMMENT ON DOMAIN stock_quantity IS
'Inventory quantity.';


-- ============================================================================
-- PERCENTAGE
-- ============================================================================

CREATE DOMAIN percentage_value AS NUMERIC(5,2)
CHECK (
    VALUE >= 0
    AND VALUE <= 100
);

COMMENT ON DOMAIN percentage_value IS
'Percentage from 0 to 100.';


-- ============================================================================
-- POSITIVE INTEGER
-- ============================================================================

CREATE DOMAIN positive_integer AS INTEGER
CHECK (
    VALUE > 0
);

COMMENT ON DOMAIN positive_integer IS
'Positive integer greater than zero.';


-- ============================================================================
-- BARCODE
-- ============================================================================

CREATE DOMAIN barcode_value AS VARCHAR(64)
CHECK (
    LENGTH(TRIM(VALUE)) > 0
);

COMMENT ON DOMAIN barcode_value IS
'Product barcode.';


-- ============================================================================
-- SKU
-- ============================================================================

CREATE DOMAIN sku_code AS VARCHAR(100)
CHECK (
    LENGTH(TRIM(VALUE)) > 0
);

COMMENT ON DOMAIN sku_code IS
'Stock Keeping Unit.';


-- ============================================================================
-- BATCH NUMBER
-- ============================================================================

CREATE DOMAIN batch_number AS VARCHAR(100);

COMMENT ON DOMAIN batch_number IS
'Drug manufacturing batch identifier.';


-- ============================================================================
-- LICENSE NUMBER
-- Pharmacy license / practitioner license
-- ============================================================================

CREATE DOMAIN license_number AS VARCHAR(100);

COMMENT ON DOMAIN license_number IS
'Professional or regulatory license identifier.';


-- ============================================================================
-- TAX PIN
-- ============================================================================

CREATE DOMAIN tax_identifier AS VARCHAR(50);

COMMENT ON DOMAIN tax_identifier IS
'Government tax registration number.';


-- ============================================================================
-- URL
-- ============================================================================

CREATE DOMAIN web_url AS TEXT
CHECK (
    VALUE ~* '^https?://'
);

COMMENT ON DOMAIN web_url IS
'HTTP or HTTPS URL.';


-- ============================================================================
-- UUID STRING
-- ============================================================================

CREATE DOMAIN uuid_text AS UUID;

COMMENT ON DOMAIN uuid_text IS
'UUID identifier.';


-- ============================================================================
-- HASH
-- ============================================================================

CREATE DOMAIN password_hash AS TEXT;

COMMENT ON DOMAIN password_hash IS
'Secure password hash.';


-- ============================================================================
-- COLOR
-- ============================================================================

CREATE DOMAIN hex_color AS CHAR(7)
CHECK (
    VALUE ~ '^#[0-9A-Fa-f]{6}$'
);

COMMENT ON DOMAIN hex_color IS
'Hexadecimal RGB color.';


-- ============================================================================
-- CURRENCY CODE
-- ISO-4217
-- ============================================================================

CREATE DOMAIN currency_code AS CHAR(3)
CHECK (
    VALUE ~ '^[A-Z]{3}$'
);

COMMENT ON DOMAIN currency_code IS
'ISO currency code.';


-- ============================================================================
-- COUNTRY CODE
-- ISO-3166
-- ============================================================================

CREATE DOMAIN country_code AS CHAR(2)
CHECK (
    VALUE ~ '^[A-Z]{2}$'
);

COMMENT ON DOMAIN country_code IS
'ISO country code.';


-- ============================================================================
-- LANGUAGE CODE
-- ============================================================================

CREATE DOMAIN language_code AS VARCHAR(10);

COMMENT ON DOMAIN language_code IS
'Application language code.';

COMMIT;