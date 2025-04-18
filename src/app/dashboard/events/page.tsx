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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarPlus, Search, Filter, MoreHorizontal, Calendar, Clock, MapPin, Users } from 'lucide-react';
import { toast } from 'sonner';

// Define event type
type Event = {
  id: string;
  title: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  event_type: string;
  status: string;
  max_participants: number;
  created_at: string;
};

export default function EventsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterTimeframe, setFilterTimeframe] = useState<string>('upcoming');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEvents, setTotalEvents] = useState(0);
  const eventsPerPage = 10;

  useEffect(() => {
    const fetchEvents = async () => {
      if (!user?.organization_id) return;

      setIsLoading(true);
      try {
        const supabase = createSupabaseBrowserClient();
        
        // Build query
        let query = supabase
          .from('events')
          .select('*', { count: 'exact' })
          .eq('organization_id', user.organization_id);
        
        // Apply search filter if provided
        if (searchQuery) {
          query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%`);
        }
        
        // Apply event type filter if not 'all'
        if (filterType !== 'all') {
          query = query.eq('event_type', filterType);
        }
        
        // Apply timeframe filter
        const now = new Date().toISOString();
        if (filterTimeframe === 'upcoming') {
          query = query.gte('start_date', now);
        } else if (filterTimeframe === 'past') {
          query = query.lt('start_date', now);
        }
        
        // Apply pagination
        const from = (currentPage - 1) * eventsPerPage;
        const to = from + eventsPerPage - 1;
        
        const { data, count, error } = await query
          .order('start_date', { ascending: filterTimeframe === 'upcoming' })
          .range(from, to);
        
        if (error) throw error;
        
        setEvents(data || []);
        setTotalEvents(count || 0);
      } catch (error) {
        console.error('Error fetching events:', error);
        toast.error('Failed to load events');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [user?.organization_id, searchQuery, filterType, filterTimeframe, currentPage]);

  const totalPages = Math.ceil(totalEvents / eventsPerPage);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleTypeFilterChange = (type: string) => {
    setFilterType(type);
    setCurrentPage(1); // Reset to first page on filter
  };

  const handleTimeframeFilterChange = (timeframe: string) => {
    setFilterTimeframe(timeframe);
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

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Events</h1>
            <p className="text-muted-foreground">
              Manage your archery club events, trainings, and competitions
            </p>
          </div>
          <Button onClick={() => router.push('/dashboard/events/create')}>
            <CalendarPlus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search events..."
              className="pl-8"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
          <div className="flex gap-2">
            <Select value={filterTimeframe} onValueChange={handleTimeframeFilterChange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="past">Past Events</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterType} onValueChange={handleTypeFilterChange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="training">Training</SelectItem>
                <SelectItem value="competition">Competition</SelectItem>
                <SelectItem value="workshop">Workshop</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Events List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Events List</CardTitle>
              <CardDescription>
                {totalEvents} total events {filterType !== 'all' ? `(filtered to ${filterType})` : ''}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant={filterTimeframe === 'upcoming' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => handleTimeframeFilterChange('upcoming')}
              >
                Upcoming
              </Button>
              <Button 
                variant={filterTimeframe === 'past' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => handleTimeframeFilterChange('past')}
              >
                Past
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center">Loading events...</div>
            ) : events.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">No events found</p>
                {searchQuery && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Try adjusting your search or filters
                  </p>
                )}
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => router.push('/dashboard/events/create')}
                >
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Create Your First Event
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                  {events.map((event) => (
                    <Link href={`/dashboard/events/${event.id}`} key={event.id} passHref>
                      <div className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        {/* Event Type Badge */}
                        <div className={`
                          ${event.event_type === 'competition' ? 'bg-orange-500' : 
                            event.event_type === 'training' ? 'bg-blue-500' : 
                            event.event_type === 'workshop' ? 'bg-green-500' : 
                            event.event_type === 'meeting' ? 'bg-purple-500' : 'bg-gray-500'} 
                          h-2 w-full`}
                        />
                        <div className="p-4">
                          <div className="flex items-start justify-between">
                            <h3 className="font-medium text-base line-clamp-1">{event.title}</h3>
                            <span className="text-xs rounded-full px-2 py-1 bg-gray-100 capitalize">
                              {event.event_type}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {event.description || "No description provided."}
                          </p>
                          
                          <div className="mt-3 space-y-1.5">
                            <div className="flex items-center text-xs text-gray-600">
                              <Calendar className="h-3.5 w-3.5 mr-1.5" />
                              <span>
                                {formatDate(event.start_date)}
                                {new Date(event.start_date).toDateString() !== new Date(event.end_date).toDateString() &&
                                  ` - ${formatDate(event.end_date)}`
                                }
                              </span>
                            </div>
                            <div className="flex items-center text-xs text-gray-600">
                              <Clock className="h-3.5 w-3.5 mr-1.5" />
                              <span>{formatTime(event.start_date)} - {formatTime(event.end_date)}</span>
                            </div>
                            {event.location && (
                              <div className="flex items-center text-xs text-gray-600">
                                <MapPin className="h-3.5 w-3.5 mr-1.5" />
                                <span className="truncate">{event.location}</span>
                              </div>
                            )}
                            {event.max_participants && (
                              <div className="flex items-center text-xs text-gray-600">
                                <Users className="h-3.5 w-3.5 mr-1.5" />
                                <span>Capacity: {event.max_participants}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-3 flex justify-end">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              event.status === 'scheduled' 
                                ? 'bg-green-100 text-green-800' 
                                : event.status === 'cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-6">
                    <div className="text-sm text-gray-500">
                      Showing {((currentPage - 1) * eventsPerPage) + 1} - {Math.min(currentPage * eventsPerPage, totalEvents)} of {totalEvents}
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