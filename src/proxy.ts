import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

// Define which routes require which roles
const roleRequirements: Record<string, string[]> = {
    '/admin-dashboard': ['ADMIN'],
    '/transactions': ['ADMIN'],
    '/organizer-dashboard': ['ADMIN', 'ORGANIZER'],
    '/create-event': ['ADMIN', 'ORGANIZER'],
    '/edit-event': ['ADMIN', 'ORGANIZER'],
    '/manage-seats': ['ADMIN', 'ORGANIZER'],
    '/tickets': ['USER', 'ADMIN', 'ORGANIZER']
};

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check if the route is a protected route
    const protectedRoutePrefix = Object.keys(roleRequirements).find(route => pathname.startsWith(route));

    if (protectedRoutePrefix) {
        const accessToken = request.cookies.get('accessToken')?.value;

        // If no token, redirect to login
        if (!accessToken) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        try {
            // Verify JWT using jose (jsonwebtoken doesn't work in Edge Middleware)
            const secret = new TextEncoder().encode(JWT_SECRET);
            const { payload } = await jwtVerify(accessToken, secret);

            const userRole = payload.role as string;
            const allowedRoles = roleRequirements[protectedRoutePrefix];

            // If user's role is not in the allowed roles for this route
            if (!allowedRoles.includes(userRole)) {
                // Return a 404 rewrite to "hide" the route completely, 
                // or you could redirect them to the home page with NextResponse.redirect(new URL('/', request.url))
                return NextResponse.rewrite(new URL('/404', request.url));
            }

        } catch (err) {
            // Token is invalid or expired
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    return NextResponse.next();
}

// Configure which paths the middleware should run on
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
