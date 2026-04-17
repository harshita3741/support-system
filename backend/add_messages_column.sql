-- Run this once in SQL Server Management Studio (or Azure Data Studio)
-- to add the messages column to video_sessions

ALTER TABLE video_sessions
ADD messages NVARCHAR(MAX) NULL;
