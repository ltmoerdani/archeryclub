import { createContext, useContext, ReactNode, useState, useEffect, useMemo } from 'react';
import { Organization } from '@/lib/types';
import { createSupabaseBrowserClient } from '@/lib/supabase';

type OrganizationContextType = {
  organization: Organization | null;
  isLoading: boolean;
  error: Error | null;
};

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};

export const OrganizationProvider = ({ children, subdomain }: { children: ReactNode; subdomain: string }) => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchOrganization = async () => {
      if (!subdomain) {
        setIsLoading(false);
        return;
      }

      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('subdomain', subdomain)
          .eq('status', 'active')
          .single();

        if (error) throw error;
        setOrganization(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch organization'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganization();
  }, [subdomain]);

  const value = useMemo(() => ({
    organization,
    isLoading,
    error,
  }), [organization, isLoading, error]);

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
};