-- Run this once in SQL Server Management Studio against the healthcare_support database.
-- It removes the foreign key that requires assigned_doctor_id to exist in the doctors table.
-- Doctors are managed in-memory by DoctorService, not in the DB, so this constraint
-- must not be enforced at the database level.

USE healthcare_support;

IF EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK__medical_c__assig__693CA210'
)
BEGIN
    ALTER TABLE medical_case DROP CONSTRAINT FK__medical_c__assig__693CA210;
    PRINT 'Constraint dropped successfully.';
END
ELSE
BEGIN
    PRINT 'Constraint not found — already removed or name differs.';
END
