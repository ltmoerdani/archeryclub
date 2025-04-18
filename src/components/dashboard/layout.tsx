'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useOrganization } from '@/components/providers/organization-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  Calendar,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Trophy,
  Users,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

type UserRole = 'super_admin' | 'admin' | 'coach' | 'member';

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  // Roles that can see this nav item - undefined means all roles can see it
  roles?: UserRole[];
}

export default function DashboardLayout({ children }: Readonly<DashboardLayoutProps>) {
  const pathname = usePathname();
  const { organization } = useOrganization();
  const { user, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when path changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Define navigation items
  const navItems: NavItem[] = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      title: 'Members',
      href: '/dashboard/members',
      icon: <Users className="h-5 w-5" />,
    },
    {
      title: 'Events',
      href: '/dashboard/events',
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      title: 'Performance',
      href: '/dashboard/performance',
      icon: <BarChart3 className="h-5 w-5" />,
    },
    {
      title: 'Competitions',
      href: '/dashboard/competitions',
      icon: <Trophy className="h-5 w-5" />,
    },
    {
      title: 'Settings',
      href: '/dashboard/settings',
      icon: <Settings className="h-5 w-5" />,
      roles: ['admin', 'super_admin'],
    },
  ];

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter(
    (item) => !item.roles || (user?.role && item.roles.includes(user.role as UserRole))
  );

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - desktop */}
      <aside
        className={`fixed inset-y-0 z-50 flex-shrink-0 w-64 flex flex-col border-r bg-white transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:static lg:translate-x-0`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <Link href="/dashboard" className="flex items-center space-x-2">
            {organization?.logo_url ? (
              <Image
                src={organization.logo_url}
                alt={organization?.name || 'Archery Club'}
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                {organization?.name?.charAt(0) ?? 'A'}
              </div>
            )}
            <span className="text-lg font-semibold truncate">
              {organization?.name ?? 'Archery Club'}
            </span>
          </Link>
          <button
            onClick={toggleSidebar}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className={`mr-3 ${isActive ? 'text-blue-700' : 'text-gray-500'}`}>
                  {item.icon}
                </span>
                {item.title}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Semi-transparent backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            aria-hidden="true"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Hidden close button for accessibility */}
          <button
            className="sr-only"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close mobile menu"
          >
            Close Menu
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between h-16 px-4 border-b bg-white">
          <button
            onClick={toggleMobileMenu}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center">
            {user && (
              <div className="flex items-center space-x-2">
                <div className="text-sm text-gray-700">
                  <span className="block font-medium">{user.full_name}</span>
                  <span className="block text-xs text-gray-500 capitalize">{user.role}</span>
                </div>
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-medium">
                  {user.full_name?.charAt(0) || 'U'}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Mobile navigation menu */}
        <div
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:hidden ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <Link href="/dashboard" className="flex items-center space-x-2">
              {organization?.logo_url ? (
                <Image
                  src={organization.logo_url}
                  alt={organization?.name || 'Archery Club'}
                  width={32}
                  height={32}
                  className="h-8 w-8 object-contain"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                  {organization?.name?.charAt(0) ?? 'A'}
                </div>
              )}
              <span className="text-lg font-semibold truncate">
                {organization?.name ?? 'Archery Club'}
              </span>
            </Link>
            <button
              onClick={toggleMobileMenu}
              className="text-gray-500 hover:text-gray-700"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
          <nav className="px-2 py-4 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className={`mr-3 ${isActive ? 'text-blue-700' : 'text-gray-500'}`}>
                    {item.icon}
                  </span>
                  {item.title}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5 mr-2" />
              Sign out
            </Button>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 bg-gray-50">{children}</main>
      </div>
    </div>
  );
}