'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { useOrganization } from '@/components/providers/organization-provider';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import DashboardLayout from '@/components/dashboard/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Trophy, 
  Users, 
  ArrowUpRight,
  Clock,
  TrendingUp
} from 'lucide-react';

type Member = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
};

type Event = {
  id: string;
  title: string;
  location: string;
  start_date: string;
};

function MemberAvatar({ firstName }: Readonly<{ firstName: string | undefined }>) {
  const initial = firstName?.charAt(0) ?? '?';
  return (
    <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-medium">
      {initial}
    </div>
  );
}

function MembersListContent({ 
  isLoading, 
  members, 
  formatDate 
}: Readonly<{ 
  isLoading: boolean; 
  members: Member[]; 
  formatDate: (date: string) => string;
}>) {
  if (isLoading) {
    return <div className="text-center py-4">Loading...</div>;
  }
  
  if (members.length > 0) {
    return (
      <div className="space-y-4">
        {members.map((member) => (
          <div 
            key={member.id} 
            className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0"
          >
            <div className="flex items-center space-x-3">
              <MemberAvatar firstName={member.first_name} />
              <div>
                <p className="text-sm font-medium leading-none">
                  {member.first_name} {member.last_name}
                </p>
                <p className="text-xs text-gray-500">
                  {member.email}
                </p>
              </div>
            </div>
            <div className="flex items-center text-xs text-gray-500">
              <Clock className="h-3 w-3 mr-1" />
              <span>Joined {formatDate(member.created_at)}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div className="text-center py-4 text-gray-500">
      No members added yet
    </div>
  );
}

function EventsListContent({ 
  isLoading, 
  events, 
  formatDate 
}: Readonly<{ 
  isLoading: boolean; 
  events: Event[]; 
  formatDate: (date: string) => string;
}>) {
  if (isLoading) {
    return <div className="text-center py-4">Loading...</div>;
  }
  
  if (events.length > 0) {
    return (
      <div className="space-y-4">
        {events.map((event) => (
          <div 
            key={event.id} 
            className="flex items-center space-x-3 border-b border-gray-100 pb-3 last:border-0"
          >
            <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-none truncate">
                {event.title}
              </p>
              <div className="flex items-center mt-1">
                <p className="text-xs text-gray-500 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDate(event.start_date)}
                </p>
                {event.location && (
                  <p className="text-xs text-gray-500 ml-3 truncate">
                    {event.location}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div className="text-center py-4 text-gray-500">
      No upcoming events
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const [stats, setStats] = useState({
    totalMembers: 0,
    upcomingEvents: 0,
    activeCompetitions: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [recentMembers, setRecentMembers] = useState<Member[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.organization_id) return;

      setIsLoading(true);
      try {
        const supabase = createSupabaseBrowserClient();
        
        // Get total members count
        const { count: membersCount } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', user.organization_id);
        
        // Get upcoming events count
        const { count: eventsCount } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', user.organization_id)
          .gte('start_date', new Date().toISOString())
          .eq('status', 'scheduled');
        
        // Get active competitions count
        const { count: competitionsCount } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', user.organization_id)
          .eq('event_type', 'competition')
          .eq('status', 'scheduled');
        
        // Get recent members
        const { data: recentMembersData } = await supabase
          .from('members')
          .select('id, first_name, last_name, email, created_at')
          .eq('organization_id', user.organization_id)
          .order('created_at', { ascending: false })
          .limit(5);
        
        // Get upcoming events
        const { data: upcomingEventsData } = await supabase
          .from('events')
          .select('id, title, location, start_date')
          .eq('organization_id', user.organization_id)
          .gte('start_date', new Date().toISOString())
          .eq('status', 'scheduled')
          .order('start_date', { ascending: true })
          .limit(3);
        
        setStats({
          totalMembers: membersCount ?? 0,
          upcomingEvents: eventsCount ?? 0,
          activeCompetitions: competitionsCount ?? 0,
        });
        
        setRecentMembers(recentMembersData || []);
        setUpcomingEvents(upcomingEventsData || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.organization_id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user?.full_name}</h1>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening with your archery club today.
          </p>
        </div>

        {/* Stats overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Members
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : stats.totalMembers}
              </div>
              <p className="text-xs text-muted-foreground">
                Active club members
              </p>
              <Button variant="link" className="p-0 h-auto mt-2" asChild>
                <Link href="/dashboard/members">
                  <span className="flex items-center text-xs">
                    View all members
                    <ArrowUpRight className="ml-1 h-3 w-3" />
                  </span>
                </Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Upcoming Events
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : stats.upcomingEvents}
              </div>
              <p className="text-xs text-muted-foreground">
                Scheduled events and sessions
              </p>
              <Button variant="link" className="p-0 h-auto mt-2" asChild>
                <Link href="/dashboard/events">
                  <span className="flex items-center text-xs">
                    View all events
                    <ArrowUpRight className="ml-1 h-3 w-3" />
                  </span>
                </Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Competitions
              </CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : stats.activeCompetitions}
              </div>
              <p className="text-xs text-muted-foreground">
                Upcoming competitions
              </p>
              <Button variant="link" className="p-0 h-auto mt-2" asChild>
                <Link href="/dashboard/competitions">
                  <span className="flex items-center text-xs">
                    View all competitions
                    <ArrowUpRight className="ml-1 h-3 w-3" />
                  </span>
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Content area */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Recent Members */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Recent Members</CardTitle>
              <CardDescription>
                Latest club members who joined
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MembersListContent 
                isLoading={isLoading}
                members={recentMembers}
                formatDate={formatDate}
              />
              
              <div className="mt-4">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/dashboard/members">View all members</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
              <CardDescription>
                Next scheduled events and activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EventsListContent 
                isLoading={isLoading}
                events={upcomingEvents}
                formatDate={formatDate}
              />
              
              <div className="mt-4">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/dashboard/events">View all events</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscription information */}
        {organization && (
          <Card className="bg-blue-50 border-blue-100">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-blue-600" />
                <span>
                  {organization.status === 'trial' ? 'Trial Subscription' : 'Subscription Status'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {organization.status === 'trial' ? (
                <>
                  <p className="text-sm mb-4">
                    You&apos;re currently on a free trial. Upgrade to a paid plan to access all features.
                  </p>
                  <Button asChild>
                    <Link href="/dashboard/settings/subscription">
                      Upgrade Now
                    </Link>
                  </Button>
                </>
              ) : (
                <p className="text-sm">
                  Your subscription is active. Manage your subscription in the settings.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}