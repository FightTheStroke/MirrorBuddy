-- ============================================================================
-- SECRET VAULT TABLE
-- Encrypted storage for external service API keys
-- Uses AES-256-GCM encryption with TOKEN_ENCRYPTION_KEY
-- ============================================================================

CREATE TABLE IF NOT EXISTS secret_vault (
  id TEXT PRIMARY KEY,
  service TEXT NOT NULL,
  key_name TEXT NOT NULL,
  encrypted TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_used TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (service, key_name)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS secret_vault_service_idx ON secret_vault(service);
CREATE INDEX IF NOT EXISTS secret_vault_status_idx ON secret_vault(status);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_secret_vault_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER secret_vault_updated_at
  BEFORE UPDATE ON secret_vault
  FOR EACH ROW
  EXECUTE FUNCTION update_secret_vault_updated_at();
