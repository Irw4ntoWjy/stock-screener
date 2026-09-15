import { NextRequest, NextResponse } from 'next/server';

export function proxy(req: NextRequest) {
	const token = req.cookies.get('token')?.value;
	const isLoginPage = req.nextUrl.pathname.startsWith('/login');
	const isRoot = req.nextUrl.pathname === '/';

	// redirect when user not login
	// disabled temporarily to allow direct access without logging in
	// if (!token && !isLoginPage) {
	// 	const loginUrl = new URL('/login', req.url);
	// 	return NextResponse.redirect(loginUrl);
	// }

	if (token && isLoginPage) {
		const homeUrl = new URL('/technical', req.url);
		return NextResponse.redirect(homeUrl);
	}

	// redirect when user access root
	if (token && isRoot) {
		const homeUrl = new URL('/technical', req.url);
		return NextResponse.redirect(homeUrl);
	}

	return NextResponse.next();
}

export const config = {
	matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
