'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { createSupabaseBrowserClient } from '@/lib/supabase';

// Define the form schema with Zod
const loginFormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize the form
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Handle form submission
  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      
      // Sign in user
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) throw error;

      // Get the user to determine if they're a super admin or regular user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, organization_id')
        .eq('email', values.email)
        .single();

      if (userError) throw userError;

      // Success - redirect based on user role
      toast.success('Login successful!');
      
      // Redirect to appropriate location - super admin to admin dashboard, others to their org
      if (userData.role === 'super_admin') {
        router.push('/admin/dashboard');
      } else {
        // Get the organization to redirect to the correct subdomain
        const { data: orgData } = await supabase
          .from('organizations')
          .select('subdomain')
          .eq('id', userData.organization_id)
          .single();
        
        // If we can get the subdomain, redirect to it
        if (orgData?.subdomain) {
          const protocol = window.location.protocol;
          const host = window.location.host.split('.').slice(1).join('.');
          window.location.href = `${protocol}//${orgData.subdomain}.${host}/dashboard`;
        } else {
          // Fallback to main dashboard if we can't get the subdomain
          router.push('/dashboard');
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Invalid email or password');
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
            <CardTitle>Log in to your account</CardTitle>
            <CardDescription>
              Enter your email and password to access your archery club dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  {isSubmitting ? 'Logging in...' : 'Log in'}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <p className="text-sm text-gray-500">
              Don't have an account?{' '}
              <Link href="/register" className="text-blue-600 hover:underline">
                Register your club
              </Link>
            </p>
            <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
              Forgot your password?
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}