import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';

// Helper to check if the request is for static assets or API routes
function isStaticOrApiRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  );
}

// Handle root domain logic
async function handleRootDomain(
  request: NextRequest, 
  url: URL, 
  session: Session | null, 
  requestHeaders: Headers
): Promise<NextResponse> {
  // If trying to access a protected page without auth, redirect to login
  if (url.pathname.startsWith('/dashboard') && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Allow access to root domain pages
  return NextResponse.next({
    headers: requestHeaders,
  });
}

// Handle subdomain routing
async function handleSubdomain(
  request: NextRequest,
  url: URL,
  session: Session | null,
  subdomain: string,
  appHost: string,
  supabase: SupabaseClient,
  requestHeaders: Headers
): Promise<NextResponse> {
  try {
    // Check if the organization exists
    const { data: organization, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('subdomain', subdomain)
      .eq('status', 'active')
      .single();

    if (error || !organization) {
      // Redirect to main site if organization not found
      return NextResponse.redirect(new URL('/', `https://${appHost}`));
    }

    // Set organization context in request headers
    requestHeaders.set('x-organization-id', organization.id);
    requestHeaders.set('x-organization-subdomain', subdomain);

    // Redirect authenticated users to their dashboard
    if (session && url.pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Handle unauthenticated access to protected routes
    if (url.pathname.startsWith('/dashboard') && !session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next({
      headers: requestHeaders,
    });
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.redirect(new URL('/', `https://${appHost}`));
  }
}

export async function middleware(request: NextRequest) {
  // Get the Supabase URLs from environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Validate environment variables
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase environment variables are missing');
    return NextResponse.next();
  }

  // Create a Supabase client with the appropriate settings
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    }
  });

  // Clone the request headers
  const requestHeaders = new Headers(request.headers);

  // Handle multi-tenancy subdomain routing
  const hostname = request.headers.get('host') ?? '';
  const url = request.nextUrl.clone();

  // Skip middleware for static assets and API routes
  if (isStaticOrApiRoute(url.pathname)) {
    return NextResponse.next();
  }

  // Get auth session
  const { data: { session } } = await supabase.auth.getSession();

  // Check if we're on a custom subdomain
  const appHost = process.env.NEXT_PUBLIC_APP_URL?.replace('https://', '').replace('http://', '') ?? '';
  const isRootDomain = hostname === appHost || hostname.endsWith(`.${appHost}`);
  const subdomain = hostname.replace(`.${appHost}`, '');

  // Process based on domain type
  if (isRootDomain && subdomain === appHost) {
    return handleRootDomain(request, url, session, requestHeaders);
  } else if (subdomain !== appHost) {
    return handleSubdomain(request, url, session, subdomain, appHost, supabase, requestHeaders);
  }

  // Default: pass the request through
  return NextResponse.next({
    headers: requestHeaders,
  });
}

export const config = {
  matcher: [
    // Match all paths except for:
    // - Files in the public folder
    // - API routes
    // - _next files
    // - favicon.ico
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};