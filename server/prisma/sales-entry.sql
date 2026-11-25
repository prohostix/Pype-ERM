-- Sales Entry: a new role, a new department type, and who typed an application or made a link.
-- Applied to the live database on 2026-11-25, after a snapshot. Do not run again there.

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'sales_entry';
ALTER TYPE "DepartmentType" ADD VALUE IF NOT EXISTS 'data_entry';

ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "enteredBy" TEXT;
ALTER TABLE "StudyCenterInvite" ADD COLUMN IF NOT EXISTS "createdById" TEXT;

CREATE INDEX IF NOT EXISTS "Enrollment_enteredBy_status_idx" ON "Enrollment"("enteredBy", "status");
CREATE INDEX IF NOT EXISTS "StudyCenterInvite_createdById_idx" ON "StudyCenterInvite"("createdById");

ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_enteredBy_fkey" FOREIGN KEY ("enteredBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudyCenterInvite" ADD CONSTRAINT "StudyCenterInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
