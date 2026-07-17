-- ============================================================
-- PharmPro Enterprise
-- Row Level Security (RLS)
-- ============================================================

-- Enable Row Level Security
ALTER TABLE "Branch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Patient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Drug" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Inventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Prescription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PrescriptionItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Sale" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SaleItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Supplier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseOrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InsurancePayer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InsuranceClaim" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClaimItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClaimStatusHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RefreshToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SystemSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BackupLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IntegrationLog" ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper Function
-- Reads the currently authenticated user's ID from the session.
-- Your backend should execute:
--
-- SET app.current_user_id = '<user-id>';
--
-- after authentication.
-- ============================================================

CREATE OR REPLACE FUNCTION current_user_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
    SELECT current_setting('app.current_user_id', true);
$$;

-- ============================================================
-- Helper Function
-- Reads the current branch from the session.
--
-- SET app.current_branch_id = '<branch-id>';
-- ============================================================

CREATE OR REPLACE FUNCTION current_branch_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
    SELECT current_setting('app.current_branch_id', true);
$$;

-- ============================================================
-- Helper Function
-- Reads the user's role.
--
-- SET app.current_role='ADMIN';
-- ============================================================

CREATE OR REPLACE FUNCTION current_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
    SELECT current_setting('app.current_role', true);
$$;

-- ============================================================
-- SUPER ADMIN
--
-- Super admins bypass branch restrictions.
-- ============================================================

CREATE POLICY super_admin_branch
ON "Branch"
FOR ALL
USING (
    current_role() = 'SUPER_ADMIN'
);

-- ============================================================
-- Branch Isolation
-- ============================================================

CREATE POLICY branch_policy
ON "Patient"
FOR ALL
USING (
    branchId = current_branch_id()
    OR current_role()='SUPER_ADMIN'
);

CREATE POLICY inventory_policy
ON "Inventory"
FOR ALL
USING (
    branchId = current_branch_id()
    OR current_role()='SUPER_ADMIN'
);

CREATE POLICY sale_policy
ON "Sale"
FOR ALL
USING (
    branchId = current_branch_id()
    OR current_role()='SUPER_ADMIN'
);

CREATE POLICY prescription_policy
ON "Prescription"
FOR ALL
USING (
    branchId = current_branch_id()
    OR current_role()='SUPER_ADMIN'
);

CREATE POLICY purchase_policy
ON "PurchaseOrder"
FOR ALL
USING (
    branchId = current_branch_id()
    OR current_role()='SUPER_ADMIN'
);

CREATE POLICY expense_policy
ON "Expense"
FOR ALL
USING (
    branchId = current_branch_id()
    OR current_role()='SUPER_ADMIN'
);

CREATE POLICY insurance_claim_policy
ON "InsuranceClaim"
FOR ALL
USING (
    branchId = current_branch_id()
    OR current_role()='SUPER_ADMIN'
);

CREATE POLICY insurance_payer_policy
ON "InsurancePayer"
FOR ALL
USING (
    branchId = current_branch_id()
    OR current_role()='SUPER_ADMIN'
);

-- ============================================================
-- User Isolation
-- Users can only view/update their own account
-- unless they are admins.
-- ============================================================

CREATE POLICY user_policy
ON "User"
FOR ALL
USING (
    id = current_user_id()
    OR current_role() IN ('ADMIN','SUPER_ADMIN')
);

-- ============================================================
-- Audit Logs
-- Only administrators can read audit logs.
-- ============================================================

CREATE POLICY audit_policy
ON "AuditLog"
FOR SELECT
USING (
    current_role() IN ('ADMIN','SUPER_ADMIN')
);

-- ============================================================
-- Notifications
-- Users only see their own notifications.
-- ============================================================

CREATE POLICY notification_policy
ON "Notification"
FOR ALL
USING (
    userId = current_user_id()
    OR current_role()='SUPER_ADMIN'
);

-- ============================================================
-- Refresh Tokens
-- ============================================================

CREATE POLICY refresh_token_policy
ON "RefreshToken"
FOR ALL
USING (
    userId = current_user_id()
);

-- ============================================================
-- Sessions
-- ============================================================

CREATE POLICY session_policy
ON "UserSession"
FOR ALL
USING (
    userId = current_user_id()
);

-- ============================================================
-- Force RLS
-- Even table owners must obey policies.
-- ============================================================

ALTER TABLE "Branch" FORCE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Patient" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Inventory" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Sale" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Prescription" FORCE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseOrder" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Expense" FORCE ROW LEVEL SECURITY;
ALTER TABLE "InsuranceClaim" FORCE ROW LEVEL SECURITY;
ALTER TABLE "InsurancePayer" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Notification" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;
ALTER TABLE "RefreshToken" FORCE ROW LEVEL SECURITY;
ALTER TABLE "UserSession" FORCE ROW LEVEL SECURITY;