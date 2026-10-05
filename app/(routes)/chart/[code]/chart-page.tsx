'use client';

import TradingViewWidget from '@/components/page/trading-view-widget';
import { Button } from '@/components/ui/button';
import { ArrowLeft, SquareArrowOutUpRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ChartPageSchema } from './chart-page-schema';

interface ChartPageClientProps {
	code: string;
	data: ChartPageSchema;
}

export function ChartPageClient({
	code,
	data,
}: ChartPageClientProps) {
	const router = useRouter();

	return (
		<div className="bg-card w-full min-h-full border border-t-0 rounded-b-lg px-3 py-3 sm:px-4 sm:py-4 gap-3 flex flex-col">
			<div className="flex justify-between items-center gap-2">
				<div className="flex min-w-0 items-center gap-3">
					<Button
						variant="outline"
						onClick={() => router.back()}
						title="Back"
						className="inline-flex w-fit shrink-0 gap-2 !bg-primary justify-start text-white hover:text-white/50 hover:bg-primary/50"
					>
						<ArrowLeft className="size-4" />
					</Button>
					<div className="min-w-0">
						<span
							className="block truncate font-medium"
							title={`${data.name} (${code})`}
						>
							{data.name} ({code})
						</span>
					</div>
				</div>

				<div className="flex shrink-0 items-center gap-2">
					<Button
						variant="outline"
						title="View on TradingView"
						onClick={() => {
							window.open(
								`https://www.tradingview.com/chart/?symbol=IDX:${code}`,
								'_blank'
							);
						}}
						className="inline-flex w-fit gap-2 !bg-primary justify-start text-white hover:text-white/50 hover:bg-primary/50"
					>
						<SquareArrowOutUpRight className="size-4" />
						<span className="hidden sm:inline">View on Trading View</span>
					</Button>
				</div>
			</div>

			<div className="w-full h-[calc(100dvh-15rem)] min-h-[360px]">
				<TradingViewWidget symbol={code} />
			</div>

			<div className="flex flex-col gap-2 text-xs sm:text-sm text-center">
				<span className="text-slate-500">
					Real-time chart power by{' '}
					<span className="text-primary font-medium">
						TradingView
					</span>
				</span>

				<span className="text-slate-500">
					Click "View More Details" to access advanced charting
					tools and technical analysis on TradingView
				</span>
			</div>
		</div>
	);
}
