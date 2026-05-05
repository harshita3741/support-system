-- Run this in SQL Server Management Studio against your healthcare_support database

-- Add patient_id column if missing
IF NOT EXISTS (
  SELECT * FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'medical_case' AND COLUMN_NAME = 'patient_id'
)
BEGIN
  ALTER TABLE medical_case ADD patient_id NVARCHAR(255);
  PRINT 'Added patient_id column';
END
ELSE
  PRINT 'patient_id already exists';

-- Add consultation_type column if missing
IF NOT EXISTS (
  SELECT * FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'medical_case' AND COLUMN_NAME = 'consultation_type'
)
BEGIN
  ALTER TABLE medical_case ADD consultation_type NVARCHAR(20);
  PRINT 'Added consultation_type column';
END
ELSE
  PRINT 'consultation_type already exists';

-- Show current columns in medical_case so you can verify
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'medical_case'
ORDER BY ORDINAL_POSITION;
