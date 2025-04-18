'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import DashboardLayout from '@/components/dashboard/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ChartLineUp, PlusCircle, Target, Medal, User, Search, Filter, BarChart4, LineChart, TrendingUp, Calendar } from 'lucide-react';
import { toast } from 'sonner';

// Define performance record type
type PerformanceRecord = {
  id: string;
  member_id: string;
  member_name: string; // Computed field
  date: string;
  distance: number;
  round_type: string;
  total_score: number;
  max_score: number;
  arrows_shot: number;
  category: string;
  notes: string;
};

// Define member type for dropdown
type Member = {
  id: string;
  first_name: string;
  last_name: string;
};

export default function PerformancePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [records, setRecords] = useState<PerformanceRecord[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMember, setFilterMember] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all');
  const [filterRound, setFilterRound] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const recordsPerPage = 10;

  // Performance statistics
  const [statistics, setStatistics] = useState({
    totalSessions: 0,
    averageScore: 0,
    bestScore: 0,
    lastSession: null as string | null,
  });

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
      }
    };

    fetchMembers();
  }, [user?.organization_id]);

  useEffect(() => {
    const fetchPerformanceRecords = async () => {
      if (!user?.organization_id) return;

      setIsLoading(true);
      try {
        const supabase = createSupabaseBrowserClient();
        
        // Build query for performance records with member names
        let query = supabase
          .from('performance_records')
          .select(`
            id, 
            member_id, 
            date, 
            distance, 
            round_type, 
            total_score, 
            max_score, 
            arrows_shot, 
            category, 
            notes, 
            members!inner(first_name, last_name, organization_id)
          `, { count: 'exact' })
          .eq('members.organization_id', user.organization_id);
        
        // Apply member filter if not 'all'
        if (filterMember !== 'all') {
          query = query.eq('member_id', filterMember);
        }
        
        // Apply date range filter
        if (filterDate === 'last-week') {
          const lastWeek = new Date();
          lastWeek.setDate(lastWeek.getDate() - 7);
          query = query.gte('date', lastWeek.toISOString().split('T')[0]);
        } else if (filterDate === 'last-month') {
          const lastMonth = new Date();
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          query = query.gte('date', lastMonth.toISOString().split('T')[0]);
        } else if (filterDate === 'last-3months') {
          const last3Months = new Date();
          last3Months.setMonth(last3Months.getMonth() - 3);
          query = query.gte('date', last3Months.toISOString().split('T')[0]);
        }
        
        // Apply round type filter if not 'all'
        if (filterRound !== 'all') {
          query = query.eq('round_type', filterRound);
        }
        
        // Apply search query if provided
        if (searchQuery) {
          // Search in members' names via the join
          query = query.or(`members.first_name.ilike.%${searchQuery}%,members.last_name.ilike.%${searchQuery}%`);
        }
        
        // Apply pagination
        const from = (currentPage - 1) * recordsPerPage;
        const to = from + recordsPerPage - 1;
        
        const { data, count, error } = await query
          .order('date', { ascending: false })
          .range(from, to);
        
        if (error) throw error;
        
        // Format the data with member names
        const formattedData = data?.map(record => ({
          id: record.id,
          member_id: record.member_id,
          member_name: `${record.members.first_name} ${record.members.last_name}`,
          date: record.date,
          distance: record.distance,
          round_type: record.round_type,
          total_score: record.total_score,
          max_score: record.max_score,
          arrows_shot: record.arrows_shot,
          category: record.category,
          notes: record.notes,
        }));
        
        setRecords(formattedData || []);
        setTotalRecords(count || 0);

        // Calculate statistics
        calculateStatistics();
      } catch (error) {
        console.error('Error fetching performance records:', error);
        toast.error('Failed to load performance records');
      } finally {
        setIsLoading(false);
      }
    };

    const calculateStatistics = async () => {
      if (!user?.organization_id) return;

      try {
        const supabase = createSupabaseBrowserClient();
        
        // Build base query with filters
        let baseQuery = supabase
          .from('performance_records')
          .select(`
            id, 
            date, 
            total_score, 
            max_score,
            members!inner(organization_id)
          `)
          .eq('members.organization_id', user.organization_id);
        
        // Apply member filter if not 'all'
        if (filterMember !== 'all') {
          baseQuery = baseQuery.eq('member_id', filterMember);
        }
        
        // Apply date range filter
        if (filterDate === 'last-week') {
          const lastWeek = new Date();
          lastWeek.setDate(lastWeek.getDate() - 7);
          baseQuery = baseQuery.gte('date', lastWeek.toISOString().split('T')[0]);
        } else if (filterDate === 'last-month') {
          const lastMonth = new Date();
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          baseQuery = baseQuery.gte('date', lastMonth.toISOString().split('T')[0]);
        } else if (filterDate === 'last-3months') {
          const last3Months = new Date();
          last3Months.setMonth(last3Months.getMonth() - 3);
          baseQuery = baseQuery.gte('date', last3Months.toISOString().split('T')[0]);
        }
        
        // Apply round type filter if not 'all'
        if (filterRound !== 'all') {
          baseQuery = baseQuery.eq('round_type', filterRound);
        }
        
        // Get total count
        const { count } = await baseQuery.count();
        
        // Get average score
        const { data: avgData } = await baseQuery
          .select('total_score, max_score')
          .then(result => {
            const { data } = result;
            if (!data || data.length === 0) return { data: [] };
            
            const total = data.reduce((sum, record) => sum + record.total_score, 0);
            return {
              data: [{
                average: data.length > 0 ? total / data.length : 0
              }]
            };
          });
        
        // Get best score
        const { data: bestScoreData } = await baseQuery
          .select('total_score')
          .order('total_score', { ascending: false })
          .limit(1);
        
        // Get last session date
        const { data: lastSessionData } = await baseQuery
          .select('date')
          .order('date', { ascending: false })
          .limit(1);
        
        setStatistics({
          totalSessions: count || 0,
          averageScore: avgData.length > 0 ? Math.round(avgData[0].average * 10) / 10 : 0,
          bestScore: bestScoreData?.length ? bestScoreData[0].total_score : 0,
          lastSession: lastSessionData?.length ? lastSessionData[0].date : null,
        });
      } catch (error) {
        console.error('Error calculating statistics:', error);
      }
    };

    fetchPerformanceRecords();
  }, [user?.organization_id, searchQuery, filterMember, filterDate, filterRound, currentPage]);

  const totalPages = Math.ceil(totalRecords / recordsPerPage);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleMemberFilterChange = (value: string) => {
    setFilterMember(value);
    setCurrentPage(1); // Reset to first page on filter
  };

  const handleDateFilterChange = (value: string) => {
    setFilterDate(value);
    setCurrentPage(1); // Reset to first page on filter
  };

  const handleRoundFilterChange = (value: string) => {
    setFilterRound(value);
    setCurrentPage(1); // Reset to first page on filter
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Calculate score percentage
  const calculatePercentage = (score: number, maxScore: number) => {
    return (score / maxScore * 100).toFixed(1);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Performance Tracking</h1>
            <p className="text-muted-foreground">
              Track and analyze archery performance of club members
            </p>
          </div>
          <Button onClick={() => router.push('/dashboard/performance/record')}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Record Performance
          </Button>
        </div>
        
        {/* Performance Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalSessions}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {filterMember === 'all' ? 'All archers' : 'Selected archer'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <BarChart4 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.averageScore}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Points per session
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Best Score</CardTitle>
              <Medal className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.bestScore}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Highest recorded score
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Session</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.lastSession ? formatDate(statistics.lastSession) : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Most recent performance record
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by archer name..."
              className="pl-8"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={filterMember} onValueChange={handleMemberFilterChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Archer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Archers</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.first_name} {member.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterDate} onValueChange={handleDateFilterChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Time Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="last-week">Last 7 Days</SelectItem>
                <SelectItem value="last-month">Last 30 Days</SelectItem>
                <SelectItem value="last-3months">Last 3 Months</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterRound} onValueChange={handleRoundFilterChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Round Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rounds</SelectItem>
                <SelectItem value="practice">Practice</SelectItem>
                <SelectItem value="competition">Competition</SelectItem>
                <SelectItem value="qualification">Qualification</SelectItem>
                <SelectItem value="training">Training</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Performance Records Table */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Records</CardTitle>
            <CardDescription>
              {totalRecords} total records {filterMember !== 'all' ? `for selected archer` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center">Loading performance records...</div>
            ) : records.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">No performance records found</p>
                {(searchQuery || filterMember !== 'all' || filterDate !== 'all' || filterRound !== 'all') && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Try adjusting your search or filters
                  </p>
                )}
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => router.push('/dashboard/performance/record')}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Record First Performance
                </Button>
              </div>
            ) : (
              <>
                <div className="relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="h-12 px-4 text-left align-middle font-medium">Date</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Archer</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Round</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Distance</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Score</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Percentage</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Arrows</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record) => (
                        <tr 
                          key={record.id} 
                          className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                          onClick={() => router.push(`/dashboard/performance/${record.id}`)}
                        >
                          <td className="p-4 align-middle">{formatDate(record.date)}</td>
                          <td className="p-4 align-middle">{record.member_name}</td>
                          <td className="p-4 align-middle capitalize">{record.round_type}</td>
                          <td className="p-4 align-middle">{record.distance}m</td>
                          <td className="p-4 align-middle font-medium">
                            {record.total_score}/{record.max_score}
                          </td>
                          <td className="p-4 align-middle">
                            <div className="flex items-center gap-2">
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div 
                                  className="bg-primary h-2.5 rounded-full" 
                                  style={{ width: `${calculatePercentage(record.total_score, record.max_score)}%` }}
                                ></div>
                              </div>
                              <span>{calculatePercentage(record.total_score, record.max_score)}%</span>
                            </div>
                          </td>
                          <td className="p-4 align-middle">{record.arrows_shot}</td>
                          <td className="p-4 align-middle">{record.category}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-6">
                    <div className="text-sm text-gray-500">
                      Showing {((currentPage - 1) * recordsPerPage) + 1} - {Math.min(currentPage * recordsPerPage, totalRecords)} of {totalRecords}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => handlePageChange(currentPage - 1)}
                      >
                        Previous
                      </Button>
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <Button
                          key={i}
                          variant={currentPage === i + 1 ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handlePageChange(i + 1)}
                        >
                          {i + 1}
                        </Button>
                      )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => handlePageChange(currentPage + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}