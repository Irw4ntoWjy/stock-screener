'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useState } from 'react';
import { ScreenerRow } from '../fundamental-page-schema';

const LOGO_BASE = 'https://s3-symbol-logo.tradingview.com';

export function SymbolLogo({
	logoid,
	ticker,
}: {
	logoid?: string;
	ticker: string;
}) {
	const [failed, setFailed] = useState(false);

	if (!logoid || failed) {
		return (
			<div className="size-6 shrink-0 rounded-full bg-primary/15 text-primary text-[9px] font-bold flex items-center justify-center">
				{ticker.slice(0, 2)}
			</div>
		);
	}

	return (
		// eslint-disable-next-line @next/next/no-img-element
		<img
			src={`${LOGO_BASE}/${logoid}.svg`}
			alt=""
			width={24}
			height={24}
			loading="lazy"
			onError={() => setFailed(true)}
			className="size-6 shrink-0 rounded-full bg-white object-cover"
		/>
	);
}

export function SymbolCell({ row }: { row: ScreenerRow }) {
	const inactive = row.active_symbol === false;
	const description =
		typeof row.description === 'string' ? row.description : '';

	return (
		<div className="flex items-center gap-3 min-w-0">
			<SymbolLogo
				logoid={
					typeof row.logoid === 'string' ? row.logoid : undefined
				}
				ticker={row.ticker}
			/>
			<Link
				href={`/company-profile/${row.ticker}?from=fundamental`}
				title="Open company profile"
				className={cn(
					'shrink-0 w-14 text-center rounded px-1.5 py-0.5 text-xs font-semibold transition-colors',
					inactive
						? 'bg-red-500/15 text-red-600 hover:bg-red-500/25'
						: 'bg-muted text-foreground hover:bg-primary hover:text-primary-foreground'
				)}
			>
				{row.ticker}
			</Link>
			<span
				className={cn(
					'truncate max-w-[280px] text-sm',
					inactive ? 'text-red-600' : 'text-foreground'
				)}
				title={description}
			>
				{description}
			</span>
			{inactive && (
				<span
					title="Not actively trading (e.g. suspended)"
					className="shrink-0 rounded bg-red-500/15 px-1 text-[10px] font-medium text-red-600"
				>
					Inactive
				</span>
			)}
		</div>
	);
}
