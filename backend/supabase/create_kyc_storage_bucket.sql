-- =====================================================
-- KYC Documents Storage Bucket Setup
-- =====================================================
-- This script sets up storage bucket for KYC documents
-- Run this in the Supabase SQL Editor
-- =====================================================

-- Note: Bucket must be created manually in Supabase Storage UI first
-- Bucket name: kyc-documents
-- Public: false (private bucket)

-- =====================================================
-- Drop existing policies if they exist
-- =====================================================
DROP POLICY IF EXISTS "Users can upload their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all KYC documents" ON storage.objects;

-- =====================================================
-- Policy 1: Authenticated users can upload their own KYC documents
-- =====================================================
-- File path structure: folder/user_id/timestamp.ext
-- We check if the path contains the user's ID
CREATE POLICY "Users can upload their own KYC documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR name LIKE '%/' || auth.uid()::text || '/%'
  )
);

-- =====================================================
-- Policy 2: Users can view their own KYC documents
-- =====================================================
CREATE POLICY "Users can view their own KYC documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR name LIKE '%/' || auth.uid()::text || '/%'
  )
);

-- =====================================================
-- Policy 3: Users can update their own KYC documents
-- =====================================================
CREATE POLICY "Users can update their own KYC documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR name LIKE '%/' || auth.uid()::text || '/%'
  )
)
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR name LIKE '%/' || auth.uid()::text || '/%'
  )
);

-- =====================================================
-- Policy 4: Users can delete their own KYC documents
-- =====================================================
CREATE POLICY "Users can delete their own KYC documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR name LIKE '%/' || auth.uid()::text || '/%'
  )
);

-- =====================================================
-- Policy 5: Admins can view all KYC documents
-- =====================================================
CREATE POLICY "Admins can view all KYC documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.user_id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
  )
);
