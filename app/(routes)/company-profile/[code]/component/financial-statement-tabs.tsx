'use client';

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	notifyStatementsChanged,
	statementTitle,
} from '@/lib/financial-statements';
import { cn } from '@/lib/utils';
import { Download } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { FinancialStatementsSchema } from '../company-profile-schema';
import { markStatementRead } from '../server/financial-statement-notifications';

const DownloadItem = ({
	name,
	url,
	onOpen,
}: {
	name: string;
	url: string;
	onOpen?: () => void;
}) => {
	return (
		<a
			href={url}
			rel="noopener noreferrer"
			download
			onClick={onOpen}
			className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-sm group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
		>
			<span className="text-foreground truncate">{name}</span>
			<Download className="h-4 w-4 text-muted-foreground group-hover:text-primary flex-shrink-0 ml-2" />
		</a>
	);
};

interface FinancialStatementProps {
	data: FinancialStatementsSchema[];
	/** Statement a notification pointed at: highlighted and scrolled to. */
	highlightId?: string;
}

export const FinancialStatementTabs = ({
	data,
	highlightId,
}: FinancialStatementProps) => {
	// read in this visit; the list itself is only refetched on tab change
	const [readIds, setReadIds] = useState<Set<string>>(new Set());
	const highlightRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		highlightRef.current?.scrollIntoView({
			behavior: 'smooth',
			block: 'center',
		});
	}, [highlightId, data]);

	if (!data || data.length === 0) {
		return undefined;
	}

	const markRead = (item: FinancialStatementsSchema) => {
		const id = item.id;
		if (!id || !item.isUnread || readIds.has(id)) return;
		setReadIds((s) => new Set(s).add(id));
		markStatementRead(id)
			.then(notifyStatementsChanged)
			.catch(() =>
				setReadIds((s) => {
					const next = new Set(s);
					next.delete(id);
					return next;
				})
			);
	};

	return (
		<div className="space-y-6 mb-2">
			<div>
				<h3 className="text-lg font-semibold mb-4">
					List Laporan Keuangan {data[0].stockCode}
				</h3>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
					{data.map((item) => {
						const downloadUrl = `https://www.idx.co.id${
							item.filePath.startsWith('/') ? '' : '/'
						}${item.filePath}`;
						const unread =
							item.isUnread && !(item.id && readIds.has(item.id));
						const highlighted = !!highlightId && item.id === highlightId;

						return (
							<Card
								key={item.id ?? `${item.reportYear}-${item.period}`}
								ref={highlighted ? highlightRef : undefined}
								className={cn(
									'bg-transparent border shadow-sm scroll-m-4 transition-shadow',
									highlighted && 'ring-2 ring-primary border-primary'
								)}
							>
								<CardHeader className="pb-3">
									<CardTitle className="flex items-start justify-between gap-2 text-base text-foreground">
										<span>{statementTitle(item)}</span>
										{unread && (
											<span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
												New
											</span>
										)}
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-2">
									<DownloadItem
										name={item.fileName}
										url={downloadUrl}
										onOpen={() => markRead(item)}
									/>
								</CardContent>
							</Card>
						);
					})}
				</div>
			</div>
		</div>
	);
};
