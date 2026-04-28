-- Run these SQL statements on your SQL Server database

-- 1. Add consultation_type to medical_case (if not already present)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_NAME = 'medical_case' AND COLUMN_NAME = 'consultation_type')
  ALTER TABLE medical_case ADD consultation_type VARCHAR(10) NULL;

-- 2. Create prescriptions table
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'prescriptions')
  CREATE TABLE prescriptions (
    id            BIGINT IDENTITY(1,1) PRIMARY KEY,
    case_id       BIGINT,
    doctor_id     BIGINT,
    doctor_name   NVARCHAR(200),
    department    NVARCHAR(100),
    patient_name  NVARCHAR(200),
    symptoms      NVARCHAR(MAX),
    diagnosis     NVARCHAR(MAX),
    medicines     NVARCHAR(MAX),
    investigations NVARCHAR(MAX),
    advice        NVARCHAR(MAX),
    follow_up_date NVARCHAR(50),
    created_at    NVARCHAR(50)
  );

-- 3. Add patientId, doctorName, status columns to appointment (if not present)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_NAME = 'appointment' AND COLUMN_NAME = 'patient_id')
  ALTER TABLE appointment ADD patient_id NVARCHAR(50) NULL;

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_NAME = 'appointment' AND COLUMN_NAME = 'doctor_name')
  ALTER TABLE appointment ADD doctor_name NVARCHAR(200) NULL;

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_NAME = 'appointment' AND COLUMN_NAME = 'status')
  ALTER TABLE appointment ADD status NVARCHAR(20) NULL DEFAULT 'BOOKED';
