'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import DashboardLayout from '@/components/dashboard/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Target, Save } from 'lucide-react';

// Define member type for dropdown
type Member = {
  id: string;
  first_name: string;
  last_name: string;
};

export default function RecordPerformancePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    member_id: '',
    date: new Date().toISOString().split('T')[0],
    distance: '18',
    round_type: 'practice',
    total_score: '',
    max_score: '300',
    arrows_shot: '30',
    category: 'recurve',
    notes: '',
  });

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchMembers = async () => {
      if (!user?.organization_id) return;

      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase
          .from('members')
          .select('id, first_name, last_name')
          .eq('organization_id', user.organization_id)
          .eq('status', 'active')
          .order('last_name', { ascending: true });

        if (error) throw error;
        setMembers(data || []);
      } catch (error) {
        console.error('Error fetching members:', error);
        toast.error('Failed to load member list');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, [user?.organization_id]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.member_id) {
      newErrors.member_id = 'Please select an archer';
    }
    
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    
    if (!formData.distance || isNaN(Number(formData.distance)) || Number(formData.distance) <= 0) {
      newErrors.distance = 'Please enter a valid distance';
    }
    
    if (!formData.round_type) {
      newErrors.round_type = 'Please select a round type';
    }
    
    if (!formData.total_score || isNaN(Number(formData.total_score)) || Number(formData.total_score) < 0) {
      newErrors.total_score = 'Please enter a valid score';
    }
    
    if (!formData.max_score || isNaN(Number(formData.max_score)) || Number(formData.max_score) <= 0) {
      newErrors.max_score = 'Please enter a valid maximum score';
    }
    
    if (Number(formData.total_score) > Number(formData.max_score)) {
      newErrors.total_score = 'Score cannot exceed maximum score';
    }
    
    if (!formData.arrows_shot || isNaN(Number(formData.arrows_shot)) || Number(formData.arrows_shot) <= 0) {
      newErrors.arrows_shot = 'Please enter a valid number of arrows';
    }
    
    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is changed
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is changed
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    
    if (!user?.organization_id) {
      toast.error('Organization not found');
      return;
    }
    
    setIsSaving(true);
    try {
      const supabase = createSupabaseBrowserClient();
      
      // Convert numeric strings to numbers
      const recordData = {
        member_id: formData.member_id,
        date: formData.date,
        distance: parseInt(formData.distance),
        round_type: formData.round_type,
        total_score: parseInt(formData.total_score),
        max_score: parseInt(formData.max_score),
        arrows_shot: parseInt(formData.arrows_shot),
        category: formData.category,
        notes: formData.notes,
      };
      
      const { error } = await supabase
        .from('performance_records')
        .insert(recordData);
        
      if (error) throw error;
      
      toast.success('Performance record saved successfully');
      router.push('/dashboard/performance');
    } catch (error) {
      console.error('Error saving performance record:', error);
      toast.error('Failed to save performance record');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/performance')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Record Performance</h1>
        </div>
        
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Performance Details</CardTitle>
              <CardDescription>
                Record a training session or competition score for an archer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Archer Selection */}
              <div className="space-y-2">
                <Label htmlFor="member_id">Archer</Label>
                <Select
                  value={formData.member_id}
                  onValueChange={(value) => handleSelectChange('member_id', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger id="member_id" className={errors.member_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select an archer" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.first_name} {member.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.member_id && (
                  <p className="text-sm text-red-500">{errors.member_id}</p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Date */}
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleChange}
                    className={errors.date ? 'border-red-500' : ''}
                  />
                  {errors.date && (
                    <p className="text-sm text-red-500">{errors.date}</p>
                  )}
                </div>
                
                {/* Round Type */}
                <div className="space-y-2">
                  <Label htmlFor="round_type">Round Type</Label>
                  <Select
                    value={formData.round_type}
                    onValueChange={(value) => handleSelectChange('round_type', value)}
                  >
                    <SelectTrigger id="round_type" className={errors.round_type ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select round type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="practice">Practice</SelectItem>
                      <SelectItem value="competition">Competition</SelectItem>
                      <SelectItem value="qualification">Qualification</SelectItem>
                      <SelectItem value="training">Training</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.round_type && (
                    <p className="text-sm text-red-500">{errors.round_type}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Distance */}
                <div className="space-y-2">
                  <Label htmlFor="distance">Distance (meters)</Label>
                  <Input
                    id="distance"
                    name="distance"
                    type="number"
                    value={formData.distance}
                    onChange={handleChange}
                    className={errors.distance ? 'border-red-500' : ''}
                  />
                  {errors.distance && (
                    <p className="text-sm text-red-500">{errors.distance}</p>
                  )}
                </div>
                
                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">Bow Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleSelectChange('category', value)}
                  >
                    <SelectTrigger id="category" className={errors.category ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recurve">Recurve</SelectItem>
                      <SelectItem value="compound">Compound</SelectItem>
                      <SelectItem value="barebow">Barebow</SelectItem>
                      <SelectItem value="traditional">Traditional</SelectItem>
                      <SelectItem value="longbow">Longbow</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-sm text-red-500">{errors.category}</p>
                  )}
                </div>
                
                {/* Arrows Shot */}
                <div className="space-y-2">
                  <Label htmlFor="arrows_shot">Number of Arrows</Label>
                  <Input
                    id="arrows_shot"
                    name="arrows_shot"
                    type="number"
                    value={formData.arrows_shot}
                    onChange={handleChange}
                    className={errors.arrows_shot ? 'border-red-500' : ''}
                  />
                  {errors.arrows_shot && (
                    <p className="text-sm text-red-500">{errors.arrows_shot}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Total Score */}
                <div className="space-y-2">
                  <Label htmlFor="total_score">Total Score</Label>
                  <Input
                    id="total_score"
                    name="total_score"
                    type="number"
                    value={formData.total_score}
                    onChange={handleChange}
                    className={errors.total_score ? 'border-red-500' : ''}
                  />
                  {errors.total_score && (
                    <p className="text-sm text-red-500">{errors.total_score}</p>
                  )}
                </div>
                
                {/* Max Score */}
                <div className="space-y-2">
                  <Label htmlFor="max_score">Maximum Possible Score</Label>
                  <Input
                    id="max_score"
                    name="max_score"
                    type="number"
                    value={formData.max_score}
                    onChange={handleChange}
                    className={errors.max_score ? 'border-red-500' : ''}
                  />
                  {errors.max_score && (
                    <p className="text-sm text-red-500">{errors.max_score}</p>
                  )}
                </div>
              </div>
              
              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Add any comments or observations about this performance session"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                type="button"
                onClick={() => router.push('/dashboard/performance')}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isSaving}
              >
                {isSaving ? (
                  <span className="flex items-center gap-1">Saving...</span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Save className="h-4 w-4" />
                    Save Record
                  </span>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}