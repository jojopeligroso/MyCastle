-- FRESH_0019: Rename payments table to invoice_payments
-- Fixes namespace collision: both business.payments and system.invoicePayments
-- were targeting the same 'payments' DB table.
--
-- NOTE: There is a question whether two payments tables are needed at all.
-- Business decision pending - see tidy.md for follow-up.

-- Rename the table
ALTER TABLE payments RENAME TO invoice_payments;

-- Update indexes (they will be renamed automatically by PostgreSQL,
-- but we rename them explicitly for clarity)
ALTER INDEX IF EXISTS idx_payments_booking RENAME TO idx_invoice_payments_invoice;
ALTER INDEX IF EXISTS idx_payments_tenant_date RENAME TO idx_invoice_payments_tenant_date;
ALTER INDEX IF EXISTS idx_payments_date RENAME TO idx_invoice_payments_date;
