-- Several principals in charge per academic class.
-- Additive and safe to run before deploying the new code (old code ignores the column).
ALTER TABLE "AcademicClass" ADD COLUMN IF NOT EXISTS "inchargeIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Existing single principal becomes the first (and only) entry
UPDATE "AcademicClass"
SET "inchargeIds" = ARRAY["inchargeId"]
WHERE "inchargeId" IS NOT NULL AND cardinality("inchargeIds") = 0;
