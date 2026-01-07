-- =====================================================
-- Storage Bucket Policies for account-logos
-- =====================================================
-- This script sets up storage policies for the account-logos bucket
-- Run this in the Supabase SQL Editor
-- =====================================================

-- First, ensure the bucket exists (create it in Storage UI if it doesn't)
-- Bucket name: account-logos
-- Public: true (so logos can be accessed via URL)

-- =====================================================
-- Policy 1: Public Read Access
-- =====================================================
-- Everyone (including anonymous users) can view/download logos
CREATE POLICY "Public can view logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'account-logos');

-- =====================================================
-- Policy 2: Admin/Super Admin Upload
-- =====================================================
-- Only authenticated users with admin role can upload logos
CREATE POLICY "Admins can upload logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'account-logos'
  AND (
    -- Check if user is admin in user_accounts table
    EXISTS (
      SELECT 1 FROM user_accounts ua
      JOIN users u ON ua.user_id = u.user_id
      WHERE ua.user_id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
  )
);

-- =====================================================
-- Policy 3: Admin/Super Admin Update
-- =====================================================
-- Only admins can update/replace logos
CREATE POLICY "Admins can update logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'account-logos'
  AND (
    EXISTS (
      SELECT 1 FROM user_accounts ua
      JOIN users u ON ua.user_id = u.user_id
      WHERE ua.user_id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
  )
)
WITH CHECK (
  bucket_id = 'account-logos'
  AND (
    EXISTS (
      SELECT 1 FROM user_accounts ua
      JOIN users u ON ua.user_id = u.user_id
      WHERE ua.user_id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
  )
);

-- =====================================================
-- Policy 4: Admin/Super Admin Delete
-- =====================================================
-- Only admins can delete logos
CREATE POLICY "Admins can delete logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'account-logos'
  AND (
    EXISTS (
      SELECT 1 FROM user_accounts ua
      JOIN users u ON ua.user_id = u.user_id
      WHERE ua.user_id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
  )
);

-- =====================================================
-- Policy 5: Service Role Full Access
-- =====================================================
-- Backend (service role) can do everything
CREATE POLICY "Service role full access to logos"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'account-logos')
WITH CHECK (bucket_id = 'account-logos');

-- =====================================================
-- Verification
-- =====================================================
-- To verify policies were created:
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%logo%';

