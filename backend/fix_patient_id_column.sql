-- STEP 1: Switch to the correct database
USE healthcare_support;
GO

-- STEP 2: Verify the table and current column types (run this first to check)
SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'medical_case'
ORDER BY ORDINAL_POSITION;
GO

-- STEP 3: Fix patient_id column — change from BIGINT to NVARCHAR
ALTER TABLE dbo.medical_case ALTER COLUMN patient_id NVARCHAR(255) NULL;
GO

PRINT 'patient_id column fixed to NVARCHAR(255)';
