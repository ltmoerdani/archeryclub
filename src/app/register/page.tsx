'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { createSupabaseBrowserClient } from '@/lib/supabase';

// Define the form schema with Zod
const registerFormSchema = z.object({
  organizationName: z.string().min(3, { message: 'Organization name must be at least 3 characters' }),
  subdomain: z
    .string()
    .min(3, { message: 'Subdomain must be at least 3 characters' })
    .max(20, { message: 'Subdomain must be at most 20 characters' })
    .regex(/^[a-z0-9-]+$/, { message: 'Subdomain can only contain lowercase letters, numbers, and hyphens' }),
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters' }),
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
});

type RegisterFormValues = z.infer<typeof registerFormSchema>;

// Extracted component for subdomain availability message
function SubdomainAvailabilityMessage({ 
  isChecking, 
  isAvailable 
}: { 
  isChecking: boolean; 
  isAvailable: boolean | null 
}) {
  if (isChecking) {
    return <p className="text-sm text-gray-500">Checking availability...</p>;
  }
  if (isAvailable === true) {
    return <p className="text-sm text-green-600">Subdomain is available!</p>;
  }
  if (isAvailable === false) {
    return <p className="text-sm text-red-600">Subdomain is already taken</p>;
  }
  return null;
}

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get('plan') ?? 'basic';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [isCheckingSubdomain, setIsCheckingSubdomain] = useState(false);

  // Initialize the form
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      organizationName: '',
      subdomain: '',
      fullName: '',
      email: '',
      password: '',
    },
  });

  // Function to check if subdomain is available
  const checkSubdomainAvailability = async (subdomain: string) => {
    if (!subdomain || subdomain.length < 3) {
      setSubdomainAvailable(null);
      return;
    }

    setIsCheckingSubdomain(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from('organizations')
        .select('id')
        .eq('subdomain', subdomain)
        .single();

      setSubdomainAvailable(!data);
    } catch (error) {
      console.error('Error checking subdomain:', error);
    } finally {
      setIsCheckingSubdomain(false);
    }
  };

  // Handle form submission
  const onSubmit = async (values: RegisterFormValues) => {
    if (subdomainAvailable === false) {
      toast.error('This subdomain is already taken. Please choose another one.');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();

      // 1. Create the organization
      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: values.organizationName,
          subdomain: values.subdomain,
          status: 'trial',
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // 2. Create subscription with trial status
      const { error: subError } = await supabase.from('subscriptions').insert({
        organization_id: organization.id,
        plan_id: selectedPlan,
        status: 'trial',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days trial
      });

      if (subError) throw subError;

      // 3. Register the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.fullName,
            organization_id: organization.id,
            role: 'admin',
          },
        },
      });

      if (authError) throw authError;

      // 4. Create the user record in our users table
      const { error: userError } = await supabase.from('users').insert({
        id: authData.user?.id,
        email: values.email,
        full_name: values.fullName,
        organization_id: organization.id,
        role: 'admin',
        status: 'active',
      });

      if (userError) throw userError;

      // Success - redirect to the onboarding page
      toast.success('Registration successful! Check your email to verify your account.');
      router.push(`/onboarding?org=${organization.id}`);
    } catch (error: unknown) {
      console.error('Registration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during registration';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold">Archery Club</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Register Your Archery Club</CardTitle>
            <CardDescription>
              Create your account and start your 14-day free trial of the {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="organizationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Club Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Bowman Archery Club" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subdomain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subdomain</FormLabel>
                      <FormControl>
                        <div className="flex items-center">
                          <Input
                            placeholder="bowman"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              checkSubdomainAvailability(e.target.value);
                            }}
                            className="rounded-r-none"
                          />
                          <div className="bg-gray-100 px-3 py-2 border border-l-0 border-input rounded-r-md text-sm text-gray-500">
                            .archeryclub.com
                          </div>
                        </div>
                      </FormControl>
                      <SubdomainAvailabilityMessage 
                        isChecking={isCheckingSubdomain}
                        isAvailable={subdomainAvailable}
                      />
                      <FormDescription>Your club will be accessible at this address</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Registering...' : 'Register & Start Free Trial'}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 hover:underline">
                Log in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}