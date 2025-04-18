// Define organization and user types
export type Organization = {
  id: string;
  name: string;
  subdomain: string;
  logo_url?: string;
  primary_color?: string;
  status: 'active' | 'inactive' | 'trial';
  created_at: string;
  updated_at: string;
};

export type SubscriptionPlan = {
  id: string;
  name: string;
  price: number;
  billing_cycle: 'monthly' | 'yearly';
  features: Record<string, boolean>;
  description?: string;
};

export type Subscription = {
  id: string;
  organization_id: string;
  plan_id: string;
  status: 'active' | 'inactive' | 'trial' | 'expired';
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
};

export type UserRole = 'super_admin' | 'admin' | 'coach' | 'member';

export type User = {
  id: string;
  email: string;
  full_name: string;
  organization_id: string;
  role: UserRole;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  updated_at: string;
};

// Database Tables
export type Tables = {
  organizations: Organization;
  subscriptions: Subscription;
  subscription_plans: SubscriptionPlan;
  users: User;
};