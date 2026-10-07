import { redirect } from 'next/navigation';

// proxy.ts already redirects "/"; this covers a request that skips it
export default function Home() {
	redirect('/technical');
}
