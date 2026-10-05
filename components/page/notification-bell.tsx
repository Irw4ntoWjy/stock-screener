'use client';

import {
	fetchUnreadStatements,
	markAllStatementsRead,
	markStatementRead,
} from '@/app/(routes)/company-profile/[code]/server/financial-statement-notifications';
import type { FinancialStatementsSchema } from '@/app/(routes)/company-profile/[code]/company-profile-schema';
import { Button } from '@/components/ui/button';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import {
	parseUtc,
	STATEMENTS_CHANGED_EVENT,
	statementHref,
	statementTitle,
	timeAgo,
} from '@/lib/financial-statements';
import { Bell, CheckCheck, FileText, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

const POLL_MS = 60_000;

export function NotificationBell() {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [items, setItems] = useState<FinancialStatementsSchema[]>();
	const [failed, setFailed] = useState(false);
	// a poll that started before a mark-as-read must not bring the item back
	const loadId = useRef(0);

	const load = useCallback(async () => {
		const id = ++loadId.current;
		try {
			const unread = await fetchUnreadStatements();
			if (id !== loadId.current) return;
			setItems(unread);
			setFailed(false);
		} catch {
			// keep showing the last good list; the next poll retries
			if (id === loadId.current) setFailed(true);
		}
	}, []);

	useEffect(() => {
		void load();
		const tick = () => {
			if (document.visibilityState === 'visible') void load();
		};
		const timer = setInterval(tick, POLL_MS);
		document.addEventListener('visibilitychange', tick);
		window.addEventListener(STATEMENTS_CHANGED_EVENT, tick);
		return () => {
			clearInterval(timer);
			document.removeEventListener('visibilitychange', tick);
			window.removeEventListener(STATEMENTS_CHANGED_EVENT, tick);
		};
	}, [load]);

	const count = items?.length ?? 0;

	const openStatement = (s: FinancialStatementsSchema) => {
		loadId.current++;
		setItems((list) => list?.filter((x) => x !== s));
		setOpen(false);
		if (s.id) markStatementRead(s.id).catch(() => load());
		router.push(statementHref(s));
	};

	const markAll = () => {
		loadId.current++;
		setItems([]);
		markAllStatementsRead().catch(() => load());
	};

	return (
		<Popover
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (next) void load();
			}}
		>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					title={
						count
							? `${count} new financial statement${count > 1 ? 's' : ''}`
							: 'Notifications'
					}
					className="relative size-9 text-muted-foreground hover:bg-muted hover:text-foreground"
				>
					<Bell className="size-5" />
					{count > 0 && (
						<span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-white">
							{count > 99 ? '99+' : count}
						</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className="flex w-96 flex-col overflow-hidden p-0 bg-card text-foreground border-border"
			>
				<div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3">
					<div>
						<p className="text-sm font-semibold">Notifications</p>
						<p className="text-xs text-muted-foreground">
							New financial statements from IDX
						</p>
					</div>
					{count > 0 && (
						<Button
							variant="ghost"
							size="sm"
							onClick={markAll}
							className="h-7 gap-1.5 px-2 text-xs text-primary hover:bg-muted hover:text-primary"
						>
							<CheckCheck className="size-3.5" />
							Mark all as read
						</Button>
					)}
				</div>

				<div className="min-h-0 flex-1 overflow-y-auto">
					{!items ? (
						<div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
							{failed ? (
								'Could not load notifications.'
							) : (
								<>
									<Loader2 className="size-4 animate-spin" />
									Loading...
								</>
							)}
						</div>
					) : !items.length ? (
						<div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
							<Bell className="size-6 opacity-40" />
							No new financial statements
						</div>
					) : (
						<ul className="divide-y">
							{items.map((s) => {
								const created = parseUtc(s.createdAt);
								return (
									<li key={s.id ?? `${s.stockCode}-${s.reportYear}-${s.period}`}>
										<button
											type="button"
											onClick={() => openStatement(s)}
											className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted cursor-pointer"
										>
											<span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
												<FileText className="size-5" />
											</span>
											<span className="min-w-0 flex-1">
												<span className="block text-sm leading-snug">
													<span className="font-semibold">
														{s.stockCode}
													</span>{' '}
													Report: &ldquo;{statementTitle(s)}&rdquo;
												</span>
												{created && (
													<span
														className="mt-1 block text-xs text-muted-foreground"
														title={created.toLocaleString()}
													>
														{timeAgo(created)}
													</span>
												)}
											</span>
											<span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
										</button>
									</li>
								);
							})}
						</ul>
					)}
				</div>
				{failed && items && (
					<p className="shrink-0 border-t px-4 py-2 text-[11px] text-muted-foreground">
						Could not refresh; showing the last list.
					</p>
				)}
			</PopoverContent>
		</Popover>
	);
}
