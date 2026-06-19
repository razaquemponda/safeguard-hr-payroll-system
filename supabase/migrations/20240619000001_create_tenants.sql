-- ============================================
-- MIGRATION: Create Tenants Table
-- Date: 2024-06-19
-- ============================================

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  logo_url TEXT,
  website VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(20),
  subscription_plan VARCHAR(50) DEFAULT 'basic',
  subscription_status VARCHAR(20) DEFAULT 'active',
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  max_users INTEGER DEFAULT 100,
  max_employees INTEGER DEFAULT 500,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for tenants
CREATE INDEX IF NOT EXISTS idx_tenants_code ON tenants(code);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(subscription_status);

-- Insert default tenant
INSERT INTO tenants (id, name, code, created_at)
SELECT 
  gen_random_uuid(),
  'Default Organization',
  'DEFAULT',
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM tenants LIMIT 1);

-- ============================================
-- Add tenant_id to auth.users (via trigger)
-- ============================================

-- Function to set tenant_id for new users
CREATE OR REPLACE FUNCTION set_user_tenant()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles 
  SET tenant_id = get_current_tenant_id()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new users
DROP TRIGGER IF EXISTS trigger_set_user_tenant ON auth.users;
CREATE TRIGGER trigger_set_user_tenant
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION set_user_tenant();