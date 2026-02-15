-- Add read-only admin role for production smoke-safe access
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ADMIN_READONLY';
