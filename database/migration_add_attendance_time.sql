-- Migration: Add attendance_time field to attendance_records table
-- This migration adds the attendance_time field to track the actual time when attendance was recorded

-- Add the attendance_time column to existing attendance_records table
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS attendance_time TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing records to use created_at as attendance_time (for backward compatibility)
UPDATE attendance_records 
SET attendance_time = created_at 
WHERE attendance_time IS NULL;

-- Make attendance_time NOT NULL after updating existing records
ALTER TABLE attendance_records 
ALTER COLUMN attendance_time SET NOT NULL;

-- Add index for better performance when querying by attendance_time
CREATE INDEX IF NOT EXISTS idx_attendance_records_attendance_time ON attendance_records(attendance_time);
