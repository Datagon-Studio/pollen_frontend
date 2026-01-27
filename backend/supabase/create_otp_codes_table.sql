-- Create OTP codes table for storing verification codes
CREATE TABLE IF NOT EXISTS otp_codes (
  otp_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  identifier TEXT NOT NULL, -- Email or phone number
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('email', 'phone')),
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_at TIMESTAMP WITH TIME ZONE NULL
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_otp_codes_lookup ON otp_codes(account_id, identifier, identifier_type, verified, expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires ON otp_codes(expires_at);

-- Function to clean up expired OTPs (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM otp_codes WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON TABLE otp_codes IS 'Stores OTP verification codes for email and phone verification during member registration';
COMMENT ON COLUMN otp_codes.identifier IS 'Email address or phone number';
COMMENT ON COLUMN otp_codes.identifier_type IS 'Type of identifier: email or phone';
COMMENT ON COLUMN otp_codes.otp_code IS 'The 6-digit OTP code';
COMMENT ON COLUMN otp_codes.expires_at IS 'When the OTP code expires';
COMMENT ON COLUMN otp_codes.verified IS 'Whether this OTP has been successfully verified';
COMMENT ON COLUMN otp_codes.attempts IS 'Number of verification attempts made';
COMMENT ON COLUMN otp_codes.max_attempts IS 'Maximum allowed verification attempts';

-- Row Level Security (RLS) Policies
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to OTP codes (needed for verification)
-- But only for unverified, non-expired codes
CREATE POLICY "Allow public read access to active OTP codes"
ON otp_codes FOR SELECT
TO public
USING (
  verified = false 
  AND expires_at > NOW()
);

-- Policy: Allow public insert for creating OTP codes (for registration)
CREATE POLICY "Allow public insert for OTP codes"
ON otp_codes FOR INSERT
TO public
WITH CHECK (true);

-- Policy: Allow public update for verification attempts
CREATE POLICY "Allow public update for OTP verification"
ON otp_codes FOR UPDATE
TO public
USING (verified = false AND expires_at > NOW())
WITH CHECK (verified = false OR verified = true);

-- Policy: Allow service role full access (for cleanup, admin operations)
CREATE POLICY "Allow service role full access"
ON otp_codes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
