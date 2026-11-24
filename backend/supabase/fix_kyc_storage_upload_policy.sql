-- =====================================================
-- Fix KYC document uploads for group admins
-- Path shape: {doc-type}/{auth.uid()}/{timestamp}.{ext}
-- The original policy compared foldername[1] to auth.uid(), but
-- foldername[1] is the doc type (business-registration, etc.).
-- Run this in the Supabase SQL Editor.
-- =====================================================

DROP POLICY IF EXISTS "Users can upload their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access on kyc documents" ON storage.objects;

CREATE POLICY "Users can upload their own KYC documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
);

CREATE POLICY "Users can view their own KYC documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
);

CREATE POLICY "Users can update their own KYC documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
)
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
);

CREATE POLICY "Users can delete their own KYC documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
);

CREATE POLICY "Service role full access on kyc documents"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'kyc-documents')
WITH CHECK (bucket_id = 'kyc-documents');
