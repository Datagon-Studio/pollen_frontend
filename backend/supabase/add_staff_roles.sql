-- Platform staff roles for the system admin portal.
-- The profile table is public.users (not auth.users).
-- The SQL editor does not always search public, so the schema is written out.

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('superadmin', 'ops', 'support', 'admin', 'user'));

COMMENT ON COLUMN public.users.role IS
  'Platform role: superadmin, ops, or support (staff portal), admin (group manager), or user';
