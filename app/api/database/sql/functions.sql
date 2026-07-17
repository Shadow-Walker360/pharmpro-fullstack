-- ============================================================
-- PharmPro Enterprise
-- Database Functions
-- ============================================================

-- ============================================================
-- Current User
-- ============================================================

CREATE OR REPLACE FUNCTION current_user_uuid()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
SELECT current_setting('app.current_user_id', true);
$$;

-- ============================================================
-- Current Branch
-- ============================================================

CREATE OR REPLACE FUNCTION current_branch_uuid()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
SELECT current_setting('app.current_branch_id', true);
$$;

-- ============================================================
-- Current Role
-- ============================================================

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
SELECT current_setting('app.current_role', true);
$$;

-- ============================================================
-- Timestamp Helper
-- ============================================================

CREATE OR REPLACE FUNCTION utc_now()
RETURNS TIMESTAMPTZ
LANGUAGE SQL
STABLE
AS $$
SELECT NOW() AT TIME ZONE 'UTC';
$$;

-- ============================================================
-- Generate Invoice Number
-- Example:
-- INV-20260708-000001
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS invoice_sequence;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE

invoice_no TEXT;

BEGIN

invoice_no :=
'INV-' ||
TO_CHAR(NOW(),'YYYYMMDD') ||
'-' ||
LPAD(nextval('invoice_sequence')::TEXT,6,'0');

RETURN invoice_no;

END;
$$;

-- ============================================================
-- Generate Receipt Number
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS receipt_sequence;

CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE

receipt_no TEXT;

BEGIN

receipt_no :=
'RCT-' ||
TO_CHAR(NOW(),'YYYYMMDD') ||
'-' ||
LPAD(nextval('receipt_sequence')::TEXT,6,'0');

RETURN receipt_no;

END;
$$;

-- ============================================================
-- Purchase Order Number
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS purchase_sequence;

CREATE OR REPLACE FUNCTION generate_purchase_order_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE

po TEXT;

BEGIN

po :=
'PO-' ||
TO_CHAR(NOW(),'YYYYMMDD') ||
'-' ||
LPAD(nextval('purchase_sequence')::TEXT,6,'0');

RETURN po;

END;
$$;

-- ============================================================
-- Insurance Claim Number
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS claim_sequence;

CREATE OR REPLACE FUNCTION generate_claim_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE

claim_no TEXT;

BEGIN

claim_no :=
'CLM-' ||
TO_CHAR(NOW(),'YYYYMMDD') ||
'-' ||
LPAD(nextval('claim_sequence')::TEXT,6,'0');

RETURN claim_no;

END;
$$;

-- ============================================================
-- Calculate Patient Age
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_age(
birth_date DATE
)
RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
SELECT EXTRACT(YEAR FROM AGE(birth_date));
$$;

-- ============================================================
-- Has Permission
-- Placeholder until RBAC tables exist
-- ============================================================

CREATE OR REPLACE FUNCTION has_permission(
permission_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN

IF current_user_role()='SUPER_ADMIN' THEN
    RETURN TRUE;
END IF;

RETURN FALSE;

END;
$$;

-- ============================================================
-- Total Stock
-- ============================================================

CREATE OR REPLACE FUNCTION total_stock(
drug TEXT
)
RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
SELECT
COALESCE(SUM(quantity),0)
FROM "Inventory"
WHERE "drugId"=drug;
$$;

-- ============================================================
-- Inventory Value
-- ============================================================

CREATE OR REPLACE FUNCTION inventory_value()
RETURNS NUMERIC
LANGUAGE SQL
STABLE
AS $$
SELECT
COALESCE(
SUM(quantity * "unitCost"),
0
)
FROM "Inventory";
$$;

-- ============================================================
-- Branch Sales
-- ============================================================

CREATE OR REPLACE FUNCTION branch_sales(
branch TEXT
)
RETURNS NUMERIC
LANGUAGE SQL
STABLE
AS $$
SELECT
COALESCE(
SUM(total),
0
)
FROM "Sale"
WHERE "branchId"=branch
AND status='COMPLETED';
$$;

-- ============================================================
-- Branch Profit
-- ============================================================

CREATE OR REPLACE FUNCTION branch_profit(
branch TEXT
)
RETURNS NUMERIC
LANGUAGE SQL
STABLE
AS $$
SELECT
COALESCE(
SUM(
total-cost
),
0
)
FROM "Sale"
WHERE "branchId"=branch;
$$;

-- ============================================================
-- Drug Low Stock
-- ============================================================

CREATE OR REPLACE FUNCTION is_low_stock(
drug TEXT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
SELECT EXISTS(

SELECT 1

FROM "Inventory"

WHERE "drugId"=drug

AND quantity<=reorderLevel

);

$$;

-- ============================================================
-- Expiring Drugs
-- ============================================================

CREATE OR REPLACE FUNCTION expiring_within(
days_ahead INTEGER
)
RETURNS TABLE(

drugId TEXT,

expiryDate DATE,

quantity INTEGER

)
LANGUAGE SQL
STABLE
AS $$

SELECT

"drugId",

"expiryDate",

quantity

FROM "Inventory"

WHERE "expiryDate"

<= CURRENT_DATE + days_ahead;

$$;