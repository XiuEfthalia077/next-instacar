-- ============================================================================
-- InstaCar — Add monthly_amortization to cars for Company profit analytics
-- ============================================================================

ALTER TABLE cars ADD COLUMN IF NOT EXISTS monthly_amortization NUMERIC DEFAULT 0;
COMMENT ON COLUMN cars.monthly_amortization IS 'Monthly financing or lease amortization for Company-owned vehicles used in net profit analytics.';
