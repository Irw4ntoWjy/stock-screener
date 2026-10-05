'use client';

import {
	BarChart3,
	Building,
	FileText,
	Search,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MarketStatusIndicator } from './market-status-indicator';
import { NotificationBell } from './notification-bell';
import { ThemeSwitch } from './theme-switch';

export default function Navbar() {
	const pathname = usePathname();

	const navItems = [
		{ path: '/technical', icon: Search, label: 'Technical' },
		{
			path: '/fundamental',
			icon: FileText,
			label: 'Fundamental',
		},
	];

	return (
		<header className="bg-card backdrop-blur supports-[backdrop-filter]:bg-card rounded-t-lg border border-b">
			<div className="container max-w-full px-3 sm:px-4">
				<div className="flex h-14 sm:h-16 items-center justify-between gap-2">
					<div className="flex min-w-0 items-center gap-2 sm:gap-8">
						<Link
							href="/technical"
							className="flex shrink-0 items-center gap-2 font-bold text-lg sm:text-xl"
						>
							<BarChart3 className="h-6 w-6 text-primary" />
							<span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
								Stocks Tracker
							</span>
						</Link>

						<nav className="flex items-center gap-1 sm:gap-2">
							{navItems.map((item) => {
								const isActive = pathname === item.path;
								return (
									<Link
										key={item.path}
										href={item.path}
										title={item.label}
										className={`flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-md text-sm font-medium transition-colors ${
											isActive
												? 'bg-primary text-primary-foreground'
												: 'text-muted-foreground hover:text-primary-foreground hover:bg-primary/80'
										}`}
									>
										<item.icon className="size-4" />
										<span className="hidden sm:inline">{item.label}</span>
									</Link>
								);
							})}
						</nav>
					</div>

					<div className="flex shrink-0 gap-6">
						<div className="flex items-center gap-2 sm:gap-4">
							<NotificationBell />
							<MarketStatusIndicator />
							<ThemeSwitch />
						</div>
					</div>
				</div>
			</div>
		</header>
	);
}
