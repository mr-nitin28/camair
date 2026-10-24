import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh auth session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protected route prefixes
  const isProtectedPath =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/faculty') ||
    pathname.startsWith('/admin');

  // Handle root entrypoint and protected path authentication
  if (!user) {
    if (pathname === '/' || isProtectedPath) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      if (isProtectedPath) {
        url.searchParams.set('redirectTo', pathname);
      }
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // User is authenticated — resolve normalized role
  const role = (user.user_metadata?.role || user.app_metadata?.role || '').toLowerCase();
  const isAdmin = role.includes('admin');
  const isFaculty = role.includes('faculty') || isAdmin;

  // Root, login, or register page dispatch to role workspace
  if (pathname === '/' || pathname === '/login' || pathname === '/register') {
    const url = request.nextUrl.clone();
    if (isAdmin) {
      url.pathname = '/admin';
    } else if (role.includes('faculty')) {
      url.pathname = '/faculty';
    } else {
      url.pathname = '/dashboard';
    }
    return NextResponse.redirect(url);
  }

  // Guard /admin workspace: require administrator role
  if (pathname.startsWith('/admin') && !isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = role.includes('faculty') ? '/faculty' : '/dashboard';
    return NextResponse.redirect(url);
  }

  // Guard /faculty workspace: require faculty or administrator role
  if (pathname.startsWith('/faculty') && !isFaculty) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions (.svg, .png, .jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
