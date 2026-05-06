-- ============================================================
-- Doctor Availability & Scheduling — SQL Server setup script
-- Run this in SSMS:  USE healthcare_support;
-- NOTE: Hibernate (ddl-auto=update) creates these automatically.
-- Only run this script manually if you prefer explicit setup.
-- ============================================================

USE healthcare_support;
GO

-- Main availability table (one row per doctor)
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_NAME = 'doctor_availability'
)
BEGIN
  CREATE TABLE doctor_availability (
    doctor_id          BIGINT       NOT NULL PRIMARY KEY,
    status             NVARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
    working_hours_start NVARCHAR(10) NULL,
    working_hours_end   NVARCHAR(10) NULL
  );
  PRINT 'Created doctor_availability';
END
GO

-- Blocked dates (e.g. "2025-12-25")
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_NAME = 'doctor_blocked_dates'
)
BEGIN
  CREATE TABLE doctor_blocked_dates (
    doctor_id    BIGINT       NOT NULL,
    blocked_date NVARCHAR(20) NULL,
    CONSTRAINT FK_blocked_dates_doctor FOREIGN KEY (doctor_id)
      REFERENCES doctor_availability (doctor_id) ON DELETE CASCADE
  );
  PRINT 'Created doctor_blocked_dates';
END
GO

-- Blocked time slots (e.g. "2025-12-20:09:00 AM")
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_NAME = 'doctor_blocked_slots'
)
BEGIN
  CREATE TABLE doctor_blocked_slots (
    doctor_id    BIGINT       NOT NULL,
    blocked_slot NVARCHAR(40) NULL,
    CONSTRAINT FK_blocked_slots_doctor FOREIGN KEY (doctor_id)
      REFERENCES doctor_availability (doctor_id) ON DELETE CASCADE
  );
  PRINT 'Created doctor_blocked_slots';
END
GO

-- Blocked days of week (e.g. "SATURDAY")
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_NAME = 'doctor_blocked_days'
)
BEGIN
  CREATE TABLE doctor_blocked_days (
    doctor_id   BIGINT       NOT NULL,
    blocked_day NVARCHAR(15) NULL,
    CONSTRAINT FK_blocked_days_doctor FOREIGN KEY (doctor_id)
      REFERENCES doctor_availability (doctor_id) ON DELETE CASCADE
  );
  PRINT 'Created doctor_blocked_days';
END
GO

-- Verify
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME IN (
  'doctor_availability', 'doctor_blocked_dates',
  'doctor_blocked_slots', 'doctor_blocked_days'
);
GO
