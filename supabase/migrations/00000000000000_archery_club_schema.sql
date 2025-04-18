-- Create tables for Archery Club SaaS platform
-- Migration version: 1

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations (Archery Clubs)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subdomain TEXT NOT NULL UNIQUE CHECK (subdomain ~* '^[a-z0-9-]+$'),
  logo_url TEXT,
  primary_color TEXT,
  address TEXT,
  phone TEXT,
  website TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'trial')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index on subdomain for faster lookups
CREATE INDEX idx_organizations_subdomain ON organizations(subdomain);

-- Subscription Plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  features JSONB NOT NULL DEFAULT '{}'::JSONB,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'trial', 'expired')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  payment_method_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index on organization_id for faster lookups
CREATE INDEX idx_subscriptions_organization_id ON subscriptions(organization_id);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'coach', 'member')),
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_organization_id ON users(organization_id);

-- Members (extended user profiles for archery club members)
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  membership_type TEXT,
  membership_start_date DATE,
  membership_end_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  custom_fields JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index on organization_id for faster lookups
CREATE INDEX idx_members_organization_id ON members(organization_id);

-- Events (competitions, training sessions, etc.)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  event_type TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  max_participants INTEGER,
  custom_fields JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index on organization_id for faster lookups
CREATE INDEX idx_events_organization_id ON events(organization_id);

-- Event Registrations
CREATE TABLE IF NOT EXISTS event_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  registration_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'registered',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, member_id)
);

-- ===============================
-- Row Level Security (RLS) Policies
-- ===============================

-- Enable Row Level Security on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- Create a function to check if a user belongs to an organization
CREATE OR REPLACE FUNCTION auth.user_is_in_organization(_organization_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users
    WHERE id = auth.uid()
    AND organization_id = _organization_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Create a function to get the current user's organization ID
CREATE OR REPLACE FUNCTION auth.user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id
  FROM users
  WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Create a function to check if the current user is an admin
CREATE OR REPLACE FUNCTION auth.user_is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Create a function to check if the current user is a super admin
CREATE OR REPLACE FUNCTION auth.user_is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users
    WHERE id = auth.uid()
    AND role = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Organization Policies
-- Super admins can view all organizations
CREATE POLICY organization_select_super_admin ON organizations
  FOR SELECT
  USING (auth.user_is_super_admin());

-- Regular users can only view their own organization
CREATE POLICY organization_select_own ON organizations
  FOR SELECT
  USING (id = auth.user_organization_id());

-- Super admins can insert new organizations 
CREATE POLICY organization_insert_super_admin ON organizations
  FOR INSERT
  WITH CHECK (auth.user_is_super_admin());

-- Super admins can update any organization
CREATE POLICY organization_update_super_admin ON organizations
  FOR UPDATE
  USING (auth.user_is_super_admin());

-- Admins can update their own organization
CREATE POLICY organization_update_own ON organizations
  FOR UPDATE
  USING (id = auth.user_organization_id() AND auth.user_is_admin());

-- Super admins can delete any organization
CREATE POLICY organization_delete_super_admin ON organizations
  FOR DELETE
  USING (auth.user_is_super_admin());

-- Subscription Policies
-- Super admins can view all subscriptions
CREATE POLICY subscription_select_super_admin ON subscriptions
  FOR SELECT
  USING (auth.user_is_super_admin());

-- Regular users can only view their organization's subscription
CREATE POLICY subscription_select_own ON subscriptions
  FOR SELECT
  USING (organization_id = auth.user_organization_id());

-- Super admins can insert new subscriptions
CREATE POLICY subscription_insert_super_admin ON subscriptions
  FOR INSERT
  WITH CHECK (auth.user_is_super_admin());

-- Super admins can update any subscription
CREATE POLICY subscription_update_super_admin ON subscriptions
  FOR UPDATE
  USING (auth.user_is_super_admin());

-- Admins can update their organization's subscription
CREATE POLICY subscription_update_own ON subscriptions
  FOR UPDATE
  USING (organization_id = auth.user_organization_id() AND auth.user_is_admin());

-- Super admins can delete any subscription
CREATE POLICY subscription_delete_super_admin ON subscriptions
  FOR DELETE
  USING (auth.user_is_super_admin());

-- User Policies
-- Super admins can view all users
CREATE POLICY user_select_super_admin ON users
  FOR SELECT
  USING (auth.user_is_super_admin());

-- Regular users can only view users from their organization
CREATE POLICY user_select_own_org ON users
  FOR SELECT
  USING (organization_id = auth.user_organization_id());

-- Super admins can insert new users
CREATE POLICY user_insert_super_admin ON users
  FOR INSERT
  WITH CHECK (auth.user_is_super_admin());

-- Admins can insert users for their organization
CREATE POLICY user_insert_own_org ON users
  FOR INSERT
  WITH CHECK (organization_id = auth.user_organization_id() AND auth.user_is_admin());

-- Super admins can update any user
CREATE POLICY user_update_super_admin ON users
  FOR UPDATE
  USING (auth.user_is_super_admin());

-- Admins can update users from their organization
CREATE POLICY user_update_own_org ON users
  FOR UPDATE
  USING (organization_id = auth.user_organization_id() AND auth.user_is_admin());

-- Users can update their own record
CREATE POLICY user_update_self ON users
  FOR UPDATE
  USING (id = auth.uid());

-- Super admins can delete any user
CREATE POLICY user_delete_super_admin ON users
  FOR DELETE
  USING (auth.user_is_super_admin());

-- Admins can delete users from their organization
CREATE POLICY user_delete_own_org ON users
  FOR DELETE
  USING (organization_id = auth.user_organization_id() AND auth.user_is_admin());

-- Similar policies for members, events, and event_registrations (tenant isolation)
-- Each organization can only access their own data

-- Member Policies
CREATE POLICY member_select_own_org ON members
  FOR SELECT
  USING (organization_id = auth.user_organization_id());

CREATE POLICY member_insert_own_org ON members
  FOR INSERT
  WITH CHECK (organization_id = auth.user_organization_id());

CREATE POLICY member_update_own_org ON members
  FOR UPDATE
  USING (organization_id = auth.user_organization_id());

CREATE POLICY member_delete_own_org ON members
  FOR DELETE
  USING (organization_id = auth.user_organization_id());

-- Event Policies
CREATE POLICY event_select_own_org ON events
  FOR SELECT
  USING (organization_id = auth.user_organization_id());

CREATE POLICY event_insert_own_org ON events
  FOR INSERT
  WITH CHECK (organization_id = auth.user_organization_id());

CREATE POLICY event_update_own_org ON events
  FOR UPDATE
  USING (organization_id = auth.user_organization_id());

CREATE POLICY event_delete_own_org ON events
  FOR DELETE
  USING (organization_id = auth.user_organization_id());

-- Event Registration Policies
CREATE POLICY event_reg_select_own_org ON event_registrations
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM events
    WHERE events.id = event_registrations.event_id
    AND events.organization_id = auth.user_organization_id()
  ));

CREATE POLICY event_reg_insert_own_org ON event_registrations
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM events
    WHERE events.id = event_registrations.event_id
    AND events.organization_id = auth.user_organization_id()
  ));

CREATE POLICY event_reg_update_own_org ON event_registrations
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM events
    WHERE events.id = event_registrations.event_id
    AND events.organization_id = auth.user_organization_id()
  ));

CREATE POLICY event_reg_delete_own_org ON event_registrations
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM events
    WHERE events.id = event_registrations.event_id
    AND events.organization_id = auth.user_organization_id()
  ));

-- Insert default subscription plans
INSERT INTO subscription_plans (name, price, billing_cycle, features, description)
VALUES
  ('basic', 29, 'monthly', '{"members": 50, "events": true, "performance_tracking": false, "custom_branding": false, "export_data": false, "api_access": false}', 'Perfect for small clubs just getting started'),
  ('pro', 59, 'monthly', '{"members": 150, "events": true, "performance_tracking": true, "custom_branding": true, "export_data": false, "api_access": false}', 'For established clubs looking to grow'),
  ('premium', 99, 'monthly', '{"members": -1, "events": true, "performance_tracking": true, "custom_branding": true, "export_data": true, "api_access": true}', 'For large clubs with extensive needs');

-- Create a trigger function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables to update the updated_at timestamp
CREATE TRIGGER update_organizations_timestamp
BEFORE UPDATE ON organizations
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_subscription_plans_timestamp
BEFORE UPDATE ON subscription_plans
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_subscriptions_timestamp
BEFORE UPDATE ON subscriptions
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_users_timestamp
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_members_timestamp
BEFORE UPDATE ON members
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_events_timestamp
BEFORE UPDATE ON events
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_event_registrations_timestamp
BEFORE UPDATE ON event_registrations
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();