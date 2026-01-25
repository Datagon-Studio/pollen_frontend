-- =====================================================
-- User Profiles Storage Bucket Setup
-- =====================================================
-- This script sets up storage bucket for user profile images
-- Run this in the Supabase SQL Editor
-- =====================================================

-- Note: Bucket must be created manually in Supabase Storage UI first
-- Bucket name: user-profiles
-- Public: true (so profile images can be accessed via URL)

-- =====================================================
-- Drop existing policies if they exist
-- =====================================================
DROP POLICY IF EXISTS "Public can view user profiles" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access to user profiles" ON storage.objects;

-- =====================================================
-- Policy 1: Public Read Access
-- =====================================================
-- Everyone (including anonymous users) can view/download profile images
CREATE POLICY "Public can view user profiles"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'user-profiles');

-- =====================================================
-- Policy 2: Users can upload their own profile images
-- =====================================================
-- File path structure: profile-images/{user_id}/{timestamp}.ext
-- Users can only upload to their own folder
CREATE POLICY "Users can upload their own profile images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-profiles'
  AND name LIKE 'profile-images/' || auth.uid()::text || '/%'
);

-- =====================================================
-- Policy 3: Users can update their own profile images
-- =====================================================
-- Users can only update files in their own folder
CREATE POLICY "Users can update their own profile images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-profiles'
  AND name LIKE 'profile-images/' || auth.uid()::text || '/%'
)
WITH CHECK (
  bucket_id = 'user-profiles'
  AND name LIKE 'profile-images/' || auth.uid()::text || '/%'
);

-- =====================================================
-- Policy 4: Users can delete their own profile images
-- =====================================================
-- Users can only delete files in their own folder
CREATE POLICY "Users can delete their own profile images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-profiles'
  AND name LIKE 'profile-images/' || auth.uid()::text || '/%'
);

-- =====================================================
-- Policy 5: Service Role Full Access
-- =====================================================
-- Backend (service role) can do everything
CREATE POLICY "Service role full access to user profiles"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'user-profiles')
WITH CHECK (bucket_id = 'user-profiles');

-- =====================================================
-- Verification
-- =====================================================
-- To verify policies were created:
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%user profile%';
