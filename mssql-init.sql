-- Create the database if it doesn't already exist
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'healthcare_support')
BEGIN
    CREATE DATABASE healthcare_support;
END
GO

USE healthcare_support;
GO

-- Create the application login (SQL auth)
IF NOT EXISTS (SELECT name FROM sys.server_principals WHERE name = 'appuser')
BEGIN
    CREATE LOGIN appuser WITH PASSWORD = '$(DB_APP_PASSWORD)';
END
GO

-- Create the database user mapped to the login
IF NOT EXISTS (SELECT name FROM sys.database_principals WHERE name = 'appuser')
BEGIN
    CREATE USER appuser FOR LOGIN appuser;
    ALTER ROLE db_owner ADD MEMBER appuser;
END
GO
