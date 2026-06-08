-- Fix KYC storage admin policy: role is 'superadmin', not 'super_admin'
DROP POLICY IF EXISTS "Admins can view all KYC documents" ON storage.objects;

CREATE POLICY "Admins can view all KYC documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.user_id = (SELECT auth.uid())
      AND u.role IN ('admin', 'superadmin')
    )
  )
);
