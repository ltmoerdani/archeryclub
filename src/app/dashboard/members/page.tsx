'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import DashboardLayout from '@/components/dashboard/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, UserPlus, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';

// Define member type
type Member = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  membership_type?: string;
  membership_start_date?: string;
  membership_end_date?: string;
  status: string;
  created_at: string;
};

// Loading component
function MembersLoading() {
  return <div className="py-8 text-center">Loading members...</div>;
}

// Empty state component
function EmptyMembers({ 
  searchQuery, 
  onAddMember 
}: Readonly<{ 
  searchQuery: string; 
  onAddMember: () => void;
}>) {
  return (
    <div className="py-8 text-center">
      <p className="text-muted-foreground">No members found</p>
      {searchQuery && (
        <p className="text-sm text-muted-foreground mt-1">
          Try adjusting your search or filters
        </p>
      )}
      <Button 
        variant="outline" 
        className="mt-4"
        onClick={onAddMember}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Your First Member
      </Button>
    </div>
  );
}

// Member status badge component
function MemberStatusBadge({ status }: Readonly<{ status: string }>) {
  const statusClass = status === 'active' 
    ? 'bg-green-100 text-green-800' 
    : 'bg-gray-100 text-gray-800';
  
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}`}
    >
      {status === 'active' ? 'Active' : 'Inactive'}
    </span>
  );
}

// Members table component
function MembersTable({ 
  members, 
  formatDate 
}: Readonly<{ 
  members: Member[]; 
  formatDate: (dateString?: string) => string;
}>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b text-sm">
            <th className="text-left py-3 px-4 font-medium">Name</th>
            <th className="text-left py-3 px-4 font-medium">Email</th>
            <th className="text-left py-3 px-4 font-medium">Phone</th>
            <th className="text-left py-3 px-4 font-medium">Membership</th>
            <th className="text-left py-3 px-4 font-medium">Status</th>
            <th className="text-right py-3 px-4 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id} className="border-b hover:bg-gray-50">
              <td className="py-3 px-4">
                <div className="flex items-center space-x-3">
                  <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-medium">
                    {member.first_name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div className="font-medium">
                      {member.first_name} {member.last_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      Added {formatDate(member.created_at)}
                    </div>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4">
                {member.email || '-'}
              </td>
              <td className="py-3 px-4">
                {member.phone || '-'}
              </td>
              <td className="py-3 px-4">
                <div>
                  <div className="font-medium">{member.membership_type ?? 'Standard'}</div>
                  {member.membership_end_date && (
                    <div className="text-xs text-gray-500">
                      Expires: {formatDate(member.membership_end_date)}
                    </div>
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                <MemberStatusBadge status={member.status} />
              </td>
              <td className="py-3 px-4 text-right">
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    asChild
                  >
                    <Link href={`/dashboard/members/${member.id}`}>
                      View
                    </Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    asChild
                  >
                    <Link href={`/dashboard/members/${member.id}/edit`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Pagination component
function MembersPagination({
  currentPage,
  totalPages,
  totalMembers,
  membersPerPage,
  onPageChange
}: Readonly<{
  currentPage: number;
  totalPages: number;
  totalMembers: number;
  membersPerPage: number;
  onPageChange: (page: number) => void;
}>) {
  if (totalPages <= 1) return null;
  
  return (
    <div className="flex justify-between items-center mt-4">
      <div className="text-sm text-gray-500">
        Showing {((currentPage - 1) * membersPerPage) + 1} - {Math.min(currentPage * membersPerPage, totalMembers)} of {totalMembers}
      </div>
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </Button>
        {Array.from({ length: totalPages }).map((_, i) => {
          const pageNumber = i + 1;
          return (
            <Button
              key={`page-${pageNumber}`}
              variant={currentPage === pageNumber ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPageChange(pageNumber)}
            >
              {pageNumber}
            </Button>
          );
        }).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default function MembersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMembers, setTotalMembers] = useState(0);
  const membersPerPage = 10;

  useEffect(() => {
    const fetchMembers = async () => {
      if (!user?.organization_id) return;

      setIsLoading(true);
      try {
        const supabase = createSupabaseBrowserClient();
        
        // Build query
        let query = supabase
          .from('members')
          .select('id, first_name, last_name, email, phone, membership_type, membership_start_date, membership_end_date, status, created_at', 
            { count: 'exact' })
          .eq('organization_id', user.organization_id);
        
        // Apply search filter if provided
        if (searchQuery) {
          query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
        }
        
        // Apply status filter if not 'all'
        if (filterStatus !== 'all') {
          query = query.eq('status', filterStatus);
        }
        
        // Apply pagination
        const from = (currentPage - 1) * membersPerPage;
        const to = from + membersPerPage - 1;
        
        const { data, count, error } = await query
          .order('created_at', { ascending: false })
          .range(from, to);
        
        if (error) throw error;
        
        setMembers(data || []);
        setTotalMembers(count ?? 0);
      } catch (error) {
        console.error('Error fetching members:', error);
        toast.error('Failed to load members');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, [user?.organization_id, searchQuery, filterStatus, currentPage]);

  const totalPages = Math.ceil(totalMembers / membersPerPage);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleFilterChange = (status: string) => {
    setFilterStatus(status);
    setCurrentPage(1); // Reset to first page on filter
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Function to render the appropriate content based on state
  const renderContent = () => {
    if (isLoading) {
      return <MembersLoading />;
    }
    
    if (members.length === 0) {
      return (
        <EmptyMembers 
          searchQuery={searchQuery} 
          onAddMember={() => router.push('/dashboard/members/add')} 
        />
      );
    }
    
    return (
      <>
        <MembersTable members={members} formatDate={formatDate} />
        <MembersPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalMembers={totalMembers}
          membersPerPage={membersPerPage}
          onPageChange={handlePageChange}
        />
      </>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Members</h1>
            <p className="text-muted-foreground">
              Manage your archery club members
            </p>
          </div>
          <Button onClick={() => router.push('/dashboard/members/add')}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search members..."
              className="pl-8"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
          <div className="flex gap-2">
            <Button 
              variant={filterStatus === 'all' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => handleFilterChange('all')}
            >
              All
            </Button>
            <Button 
              variant={filterStatus === 'active' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => handleFilterChange('active')}
            >
              Active
            </Button>
            <Button 
              variant={filterStatus === 'inactive' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => handleFilterChange('inactive')}
            >
              Inactive
            </Button>
          </div>
        </div>
        
        {/* Members List */}
        <Card>
          <CardHeader>
            <CardTitle>Members List</CardTitle>
            <CardDescription>
              {totalMembers} total members {filterStatus !== 'all' ? `(filtered to ${filterStatus})` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderContent()}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}