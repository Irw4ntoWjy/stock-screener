import type { Metadata } from 'next';
import './globals.css';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from 'sonner';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

export const metadata: Metadata = {
	title: 'IDX Stocks Screener',
	description: 'IDX Stocks Watchlist',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className="h-full" suppressHydrationWarning>
			<body
				className={`${geistSans.variable} ${geistMono.variable} h-full flex flex-col antialiased p-2 sm:p-4 lg:p-6`}
			>
				{children}
				<Toaster richColors position="top-center" />
			</body>
		</html>
	);
}
