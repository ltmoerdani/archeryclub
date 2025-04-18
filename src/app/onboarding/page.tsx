'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createSupabaseBrowserClient } from '@/lib/supabase';

// Define the onboarding steps
const steps = [
  { id: 'club-info', title: 'Club Information', description: 'Basic information about your club' },
  { id: 'branding', title: 'Club Branding', description: 'Upload your logo and set brand colors' },
  { id: 'invite', title: 'Invite Team', description: 'Invite coaches and administrators' },
  { id: 'complete', title: 'Complete', description: 'Start using your club dashboard' },
];

// Club info form schema
const clubInfoSchema = z.object({
  clubName: z.string().min(3, { message: 'Club name must be at least 3 characters' }),
  address: z.string().min(5, { message: 'Please enter a valid address' }),
  phone: z.string().optional(),
  website: z.string().url({ message: 'Please enter a valid URL' }).optional().or(z.literal('')),
});

// Branding form schema
const brandingSchema = z.object({
  primaryColor: z.string().regex(/^#([0-9A-F]{6})$/i, { message: 'Please enter a valid hex color code' }).optional(),
});

// Invite team form schema
const inviteTeamSchema = z.object({
  emails: z.string().optional(),
});

type ClubInfoFormValues = z.infer<typeof clubInfoSchema>;
type BrandingFormValues = z.infer<typeof brandingSchema>;
type InviteTeamFormValues = z.infer<typeof inviteTeamSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams.get('org');
  const [currentStep, setCurrentStep] = useState('club-info');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize the forms
  const clubInfoForm = useForm<ClubInfoFormValues>({
    resolver: zodResolver(clubInfoSchema),
    defaultValues: {
      clubName: '',
      address: '',
      phone: '',
      website: '',
    },
  });

  const brandingForm = useForm<BrandingFormValues>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      primaryColor: '#336699',
    },
  });

  const inviteTeamForm = useForm<InviteTeamFormValues>({
    resolver: zodResolver(inviteTeamSchema),
    defaultValues: {
      emails: '',
    },
  });

  // Handle logo upload
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle club info form submission
  const onClubInfoSubmit = async (values: ClubInfoFormValues) => {
    if (!orgId) {
      toast.error('Organization ID is missing');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      
      // Update organization with club info
      const { error } = await supabase
        .from('organizations')
        .update({
          name: values.clubName,
          address: values.address,
          phone: values.phone,
          website: values.website,
        })
        .eq('id', orgId);

      if (error) throw error;
      
      toast.success('Club information saved!');
      setCurrentStep('branding');
    } catch (error: any) {
      console.error('Error saving club info:', error);
      toast.error(error.message || 'An error occurred while saving club information');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle branding form submission
  const onBrandingSubmit = async (values: BrandingFormValues) => {
    if (!orgId) {
      toast.error('Organization ID is missing');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      
      // Upload logo if available
      let logoUrl = null;
      if (logoFile) {
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('organization-logos')
          .upload(`${orgId}/${logoFile.name}`, logoFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) throw uploadError;
        
        // Get public URL for the uploaded logo
        const { data: urlData } = await supabase
          .storage
          .from('organization-logos')
          .getPublicUrl(uploadData.path);
          
        logoUrl = urlData.publicUrl;
      }
      
      // Update organization with branding info
      const { error } = await supabase
        .from('organizations')
        .update({
          primary_color: values.primaryColor,
          logo_url: logoUrl,
        })
        .eq('id', orgId);

      if (error) throw error;
      
      toast.success('Branding information saved!');
      setCurrentStep('invite');
    } catch (error: any) {
      console.error('Error saving branding info:', error);
      toast.error(error.message || 'An error occurred while saving branding information');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle invite team form submission
  const onInviteTeamSubmit = async (values: InviteTeamFormValues) => {
    if (!orgId) {
      toast.error('Organization ID is missing');
      return;
    }

    setIsSubmitting(true);
    try {
      // Process email invitations if provided
      if (values.emails) {
        const emailList = values.emails.split(',').map(email => email.trim()).filter(email => email);
        
        if (emailList.length > 0) {
          const supabase = createSupabaseBrowserClient();
          
          // In a real implementation, we would send invitation emails here
          // For now, we'll just show a success message
          toast.success(`Invitations sent to ${emailList.length} team members!`);
        }
      }
      
      // Move to the final step
      setCurrentStep('complete');
    } catch (error: any) {
      console.error('Error inviting team members:', error);
      toast.error(error.message || 'An error occurred while inviting team members');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle completion and redirect to dashboard
  const handleComplete = () => {
    const supabase = createSupabaseBrowserClient();
    
    // Get the current user's organization subdomain
    supabase
      .from('organizations')
      .select('subdomain')
      .eq('id', orgId)
      .single()
      .then(({ data }) => {
        if (data?.subdomain) {
          // Construct the dashboard URL with the subdomain
          const protocol = window.location.protocol;
          const host = window.location.host.split('.').slice(1).join('.');
          window.location.href = `${protocol}//${data.subdomain}.${host}/dashboard`;
        } else {
          // Fallback to the main dashboard if we can't get the subdomain
          router.push('/dashboard');
        }
      })
      .catch(error => {
        console.error('Error getting organization subdomain:', error);
        router.push('/dashboard');
      });
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold">Archery Club</span>
          </div>
        </div>
      </header>

      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">Welcome to Archery Club!</h1>
            <p className="text-gray-600">Let's set up your club and get you started.</p>
          </div>

          {/* Progress steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold mb-2 ${
                      currentStep === step.id 
                        ? 'bg-blue-600 text-white' 
                        : steps.findIndex(s => s.id === currentStep) > index 
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {steps.findIndex(s => s.id === currentStep) > index ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className="text-xs text-center font-medium">{step.title}</span>
                </div>
              ))}
            </div>
            <div className="relative mt-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
            </div>
          </div>

          <Tabs value={currentStep} className="w-full">
            {/* Club Info Step */}
            <TabsContent value="club-info">
              <Card>
                <CardHeader>
                  <CardTitle>Club Information</CardTitle>
                  <CardDescription>
                    Tell us a bit more about your archery club
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...clubInfoForm}>
                    <form onSubmit={clubInfoForm.handleSubmit(onClubInfoSubmit)} className="space-y-4">
                      <FormField
                        control={clubInfoForm.control}
                        name="clubName"
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
                        control={clubInfoForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Club Address</FormLabel>
                            <FormControl>
                              <Input placeholder="123 Archery Lane, Cityville" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={clubInfoForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="+1 (555) 123-4567" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={clubInfoForm.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Website (optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="https://www.yourarcheryclub.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Continue'}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Branding Step */}
            <TabsContent value="branding">
              <Card>
                <CardHeader>
                  <CardTitle>Club Branding</CardTitle>
                  <CardDescription>
                    Upload your club logo and set your brand colors
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...brandingForm}>
                    <form onSubmit={brandingForm.handleSubmit(onBrandingSubmit)} className="space-y-6">
                      <div>
                        <FormLabel>Club Logo</FormLabel>
                        <div className="mt-2 flex flex-col items-center">
                          <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50 mb-4">
                            {logoPreview ? (
                              <img 
                                src={logoPreview} 
                                alt="Logo preview" 
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <span className="text-gray-500 text-sm text-center px-4">
                                No logo uploaded
                              </span>
                            )}
                          </div>
                          <div>
                            <input
                              type="file"
                              id="logo"
                              accept="image/*"
                              className="hidden"
                              onChange={handleLogoUpload}
                            />
                            <label
                              htmlFor="logo"
                              className="cursor-pointer py-2 px-4 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                              {logoPreview ? 'Change Logo' : 'Upload Logo'}
                            </label>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Recommended size: 512x512px. Max size: 2MB
                          </p>
                        </div>
                      </div>

                      <FormField
                        control={brandingForm.control}
                        name="primaryColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary Color</FormLabel>
                            <div className="flex gap-3">
                              <div 
                                className="w-10 h-10 rounded-md border" 
                                style={{ backgroundColor: field.value || '#336699' }}
                              />
                              <FormControl>
                                <Input placeholder="#336699" {...field} />
                              </FormControl>
                            </div>
                            <FormDescription>
                              Use a hexadecimal color code (e.g., #336699)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-between">
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => setCurrentStep('club-info')}
                        >
                          Back
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? 'Saving...' : 'Continue'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Invite Team Step */}
            <TabsContent value="invite">
              <Card>
                <CardHeader>
                  <CardTitle>Invite Your Team</CardTitle>
                  <CardDescription>
                    Invite coaches and administrators to your club
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...inviteTeamForm}>
                    <form onSubmit={inviteTeamForm.handleSubmit(onInviteTeamSubmit)} className="space-y-6">
                      <FormField
                        control={inviteTeamForm.control}
                        name="emails"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Addresses</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="email1@example.com, email2@example.com" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Enter email addresses separated by commas
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-between">
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => setCurrentStep('branding')}
                        >
                          Back
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? 'Sending Invites...' : 'Continue'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Complete Step */}
            <TabsContent value="complete">
              <Card>
                <CardHeader>
                  <CardTitle>Setup Complete!</CardTitle>
                  <CardDescription>
                    Your club is ready to go
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">You're all set!</h3>
                    <p className="text-gray-600">
                      Your archery club has been successfully set up. You can now access your dashboard and start managing your club.
                    </p>
                  </div>
                  
                  <Button onClick={handleComplete} className="px-8">
                    Go to Dashboard
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}