'use client';

import { DataTablePagination } from '@/components/page/pagination';
import { Spinner } from '@/components/page/spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, debounce, ExportConfig, exportToExcel } from '@/lib/utils';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import {
	PaginationState,
	SortingState,
	Updater,
} from '@tanstack/react-table';
import { FileDown, RefreshCcw, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
	ScreenerTable,
	useScreenerTable,
} from './component/screener-table';
import { AddFilterMenu } from './component/add-filter-menu';
import { withComputed } from './column-catalog';
import {
	AddedFilterChip,
	ConditionChip,
	DateRangeChip,
	MultiSelectChip,
	PerfConditionChip,
} from './component/filter-chips';
import {
	formatUnixDate,
	idxIndexCodes,
	LOT_SIZE,
	ratingLabel,
} from './format';
import {
	formatMarketDate,
	formatMarketTime,
	isMarketHours,
	todayMarketDate,
} from './market-hours';
import {
	AddedFilter,
	ConditionValue,
	ScreenerFilters,
	ScreenerResult,
	ScreenerRow,
	ScreenerTabId,
} from './fundamental-page-schema';
import {
	ANALYST_RATINGS,
	columnFields,
	CONDITION_CHIPS,
	DEFAULT_TAB,
	getTab,
	INDEXES,
	RECENT_EARNINGS_FIELD,
	RECENT_EARNINGS_OPTIONS,
	SCREENER_TABS,
	ScreenerColumn,
	SECTORS,
	UPCOMING_EARNINGS_FIELD,
	UPCOMING_EARNINGS_OPTIONS,
} from './screener-config';
import { scanIdxStocks } from './server/fetch-fundamental-data';
import { getFundamentalColumns } from './table-config';

const PAGE_SIZE = 50;
/**
 * Poll cadence while a session is running. It matches the server-side cache TTL
 * so concurrent viewers coalesce onto one upstream request per minute.
 */
const REFRESH_MS = 60 * 1000;
const DEFAULT_SORT: SortingState = [
	{ id: 'market_cap_basic', desc: true },
];

interface FundamentalPageProps {
	initialData: ScreenerResult;
	initialError?: string;
}

/** Columns the user added through the "+" header button, per tab. */
type AddedColumns = Partial<Record<ScreenerTabId, ScreenerColumn[]>>;
// stable identity, so memos keyed on a tab's added columns do not churn
const NO_COLUMNS: ScreenerColumn[] = [];

// Per-viewer convenience: a blocked or wiped store just means no added columns.
const ADDED_COLUMNS_KEY = 'fundamental.added-columns.v1';
const readAddedColumns = (): AddedColumns => {
	try {
		const raw = localStorage.getItem(ADDED_COLUMNS_KEY);
		const parsed = raw ? JSON.parse(raw) : {};
		return parsed && typeof parsed === 'object' ? parsed : {};
	} catch {
		return {};
	}
};
const saveAddedColumns = (value: AddedColumns) => {
	try {
		localStorage.setItem(ADDED_COLUMNS_KEY, JSON.stringify(value));
	} catch {
		// storage unavailable: the columns still work for this visit
	}
};

const hasColumn = (
	tab: ScreenerTabId,
	id: string,
	added: ScreenerColumn[] = []
) =>
	id === 'symbol' ||
	getTab(tab).columns.some((c) => c.field === id) ||
	added.some((c) => c.field === id);

const exportValue = (col: ScreenerColumn, row: ScreenerRow) => {
	const v = row[col.field];
	switch (col.format) {
		case 'text':
			return String(row[col.displayField ?? col.field] ?? '');
		case 'rating':
			return String(
				(col.displayField && row[col.displayField]) ||
					ratingLabel(v) ||
					''
			);
		case 'patterns':
			return Array.isArray(v) ? v.join(', ') : String(v ?? '');
		case 'indexes':
			return idxIndexCodes(v).join(', ');
		case 'date':
			return formatUnixDate(v) ?? '';
		case 'lot':
			return typeof v === 'number' ? v / LOT_SIZE : '';
		default:
			return typeof v === 'number' ? v : '';
	}
};

export default function FundamentalPage({
	initialData,
	initialError,
}: FundamentalPageProps) {
	const [tab, setTab] = useState<ScreenerTabId>(DEFAULT_TAB);
	const [filters, setFilters] = useState<ScreenerFilters>({});
	const [search, setSearch] = useState('');
	const [result, setResult] = useState(initialData);
	const [error, setError] = useState(initialError);
	const [isPending, startTransition] = useTransition();
	const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORT);
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: PAGE_SIZE,
	});
	const requestId = useRef(0);
	const [marketOpen, setMarketOpen] = useState(() => isMarketHours());
	const [addedColumns, setAddedColumns] = useState<AddedColumns>({});
	const addedRef = useRef(addedColumns);
	const tabAdded = addedColumns[tab] ?? NO_COLUMNS;

	const load = (
		nextTab: ScreenerTabId,
		nextFilters: ScreenerFilters,
		{ force = false, resetPage = true, silent = false } = {}
	) => {
		const id = ++requestId.current;
		const run = async () => {
			try {
				const data = await scanIdxStocks({
					tab: nextTab,
					filters: nextFilters,
					extraFields: (addedRef.current[nextTab] ?? []).flatMap(
						columnFields
					),
					force,
				});
				if (id !== requestId.current) return; // a newer request won
				setResult(data);
				setError(undefined);
				if (resetPage)
					setPagination((p) => ({ ...p, pageIndex: 0 }));
			} catch (e) {
				if (id !== requestId.current) return;
				// a failed background poll leaves the last good rows on screen
				// instead of throwing a toast at someone who did not ask
				if (silent) return;
				const message =
					e instanceof Error ? e.message : 'Failed to load data';
				setError(message);
				toast.error('Failed to load screener data from TradingView');
			}
		};
		// background polls stay outside the transition, so the loading overlay
		// does not flash over the table once a minute
		if (silent) void run();
		else startTransition(run);
	};

	// refs so debounced callbacks never read stale state
	const filtersRef = useRef(filters);
	const tabRef = useRef(tab);

	const updateFilters = (patch: Partial<ScreenerFilters>) => {
		const next = { ...filtersRef.current, ...patch };
		filtersRef.current = next;
		setFilters(next);
		load(tabRef.current, next);
	};

	const setCondition = (field: string, value: ConditionValue | undefined) => {
		const conditions = { ...(filtersRef.current.conditions ?? {}) };
		if (value) conditions[field] = value;
		else delete conditions[field];
		updateFilters({ conditions });
	};

	const addCustomFilter = (added: AddedFilter) => {
		const custom = { ...(filtersRef.current.custom ?? {}), [added.key]: added };
		updateFilters({ custom });
	};

	const removeCustomFilter = (key: string) => {
		const custom = { ...(filtersRef.current.custom ?? {}) };
		delete custom[key];
		updateFilters({ custom });
	};

	const changeTab = (next: ScreenerTabId) => {
		if (next === tab) return;
		setTab(next);
		tabRef.current = next;
		// keep the sort if the new tab still has that column
		setSorting((s) =>
			s.filter((x) => hasColumn(next, x.id, addedRef.current[next]))
		);
		load(next, filtersRef.current);
	};

	const onSearch = (value: string) => {
		setSearch(value);
		debounce(() => updateFilters({ search: value }), 500);
	};

	const activeFilterCount =
		(filters.search?.trim() ? 1 : 0) +
		(filters.indexes?.length ? 1 : 0) +
		(filters.sectors?.length ? 1 : 0) +
		(filters.ratings?.length ? 1 : 0) +
		Object.keys(filters.conditions ?? {}).length +
		Object.keys(filters.custom ?? {}).length;

	const resetFilters = () => {
		setSearch('');
		filtersRef.current = {};
		setFilters({});
		load(tabRef.current, {});
	};

	// `load` closes over fresh state on every render, so the timers below reach
	// it through a ref and the listeners can stay mounted for the page's life.
	const pollRef = useRef<() => void>(() => {});
	useEffect(() => {
		pollRef.current = () => {
			setMarketOpen(isMarketHours());
			if (document.visibilityState !== 'visible' || !isMarketHours())
				return;
			load(tabRef.current, filtersRef.current, {
				resetPage: false,
				silent: true,
			});
		};
	});

	useEffect(() => {
		const tick = () => pollRef.current();
		const timer = setInterval(tick, REFRESH_MS);
		// a tab left open overnight catches up the moment it is looked at again
		document.addEventListener('visibilitychange', tick);
		return () => {
			clearInterval(timer);
			document.removeEventListener('visibilitychange', tick);
		};
	}, []);

	// Restored after mount (localStorage is not there during SSR); the first
	// render's server data lacks their fields, so fetch once more if needed.
	useEffect(() => {
		const stored = readAddedColumns();
		addedRef.current = stored;
		setAddedColumns(stored);
		if (stored[tabRef.current]?.length)
			load(tabRef.current, filtersRef.current, { resetPage: false });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const toggleAddedColumn = (col: ScreenerColumn) => {
		const current = addedRef.current[tabRef.current] ?? [];
		const exists = current.some((c) => c.field === col.field);
		const nextForTab = exists
			? current.filter((c) => c.field !== col.field)
			: [...current, col];
		const next = { ...addedRef.current, [tabRef.current]: nextForTab };
		addedRef.current = next;
		setAddedColumns(next);
		saveAddedColumns(next);
		if (exists) {
			setSorting((s) => s.filter((x) => x.id !== col.field));
		} else {
			load(tabRef.current, filtersRef.current, { resetPage: false });
		}
	};

	const columns = useMemo(
		() =>
			getFundamentalColumns(
				tab,
				result.totalCount,
				tabAdded,
				toggleAddedColumn
			),
		// toggleAddedColumn only reads refs, so a stale copy behaves the same
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[tab, result.totalCount, tabAdded]
	);

	const rows = useMemo(
		() => withComputed(result.rows, tabAdded),
		[result.rows, tabAdded]
	);

	const meta = useMemo(
		() => ({
			addColumn: {
				tabFields: new Set(getTab(tab).columns.map((c) => c.field)),
				addedFields: new Set(tabAdded.map((c) => c.field)),
				onToggle: toggleAddedColumn,
			},
		}),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[tab, tabAdded]
	);

	const table = useScreenerTable({
		columns,
		data: rows,
		meta,
		sorting,
		onSortingChange: (u: Updater<SortingState>) => {
			setSorting(u);
			setPagination((p) => ({ ...p, pageIndex: 0 }));
		},
		pagination,
		onPaginationChange: setPagination,
	});

	const handleExport = () => {
		const current = getTab(tab);
		const config: ExportConfig<ScreenerRow> = {
			sheetName: current.label,
			fileName: `IDX Screener - ${current.label}`,
			columns: [
				{ header: 'Code', width: 8, value: (r) => r.ticker },
				{
					header: 'Name',
					width: 38,
					value: (r) => String(r.description ?? ''),
				},
				...[...current.columns, ...tabAdded].map((col) => ({
					header: col.sub ? `${col.label} (${col.sub})` : col.label,
					width: col.width ?? 16,
					value: (r: ScreenerRow) => exportValue(col, r),
					cellStyle: ['text', 'rating', 'patterns', 'indexes', 'date'].includes(
						col.format
					)
						? undefined
						: { numFmt: '#,##0.00' },
				})),
			],
		};
		exportToExcel(
			table.getSortedRowModel().rows.map((r) => r.original),
			config
		);
	};

	// Always WIB: the exchange's clock is the only one that means anything here,
	// and a fixed zone keeps the SSR markup and the hydrated markup identical.
	const updatedAt = formatMarketTime(result.fetchedAt);
	const sessionDate =
		typeof result.marketTime === 'number'
			? formatMarketDate(result.marketTime)
			: undefined;

	// Three states, because "closed" alone hid the one that caused confusion:
	// waiting on today's first prints, live, and closed on today's own numbers.
	const statusLabel = result.staleSession
		? `No ${todayMarketDate()} session yet`
		: marketOpen
		? `Updated ${updatedAt} WIB`
		: `Market closed · ${sessionDate ?? todayMarketDate()} close`;

	const statusDetail = [
		`Fetched ${updatedAt} WIB`,
		result.updateMode,
		result.staleSession && sessionDate
			? `Trade columns blank until ${todayMarketDate()} trades — upstream is still on the ${sessionDate} bar`
			: undefined,
	]
		.filter(Boolean)
		.join(' · ');

	return (
		<div className="bg-card w-full h-full border border-t-0 rounded-b-lg px-4 py-4 flex flex-col gap-3 min-h-0">
			{/* Title */}
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h2 className="text-2xl font-semibold mb-1 flex items-center gap-2">
						<div className="h-8 w-1 bg-primary rounded-full" />
						Stock Screener
					</h2>
					<p className="text-muted-foreground text-sm">
						All IDX stocks · data from TradingView, delayed ~10
						minutes
					</p>
				</div>

				<div className="flex items-center gap-2">
					<div className="relative w-64">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
						<Input
							value={search}
							placeholder="Search code or name..."
							onChange={(e) => onSearch(e.target.value)}
							className="pl-9 pr-8 h-9 border-border dark:bg-muted"
						/>
						{search && (
							<button
								type="button"
								aria-label="Clear search"
								onClick={() => {
									setSearch('');
									// replaces any pending debounced search
									debounce(() => updateFilters({ search: '' }), 0);
								}}
								className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
							>
								<X className="size-4" />
							</button>
						)}
					</div>
					<Button
						onClick={handleExport}
						className="bg-primary hover:bg-primary/90"
					>
						<FileDown className="size-4" />
						Export to Excel
					</Button>
				</div>
			</div>

			{/* Filter chips */}
			<div className="flex flex-wrap items-center gap-2">
				<MultiSelectChip
					label="Index"
					options={INDEXES}
					selected={filters.indexes ?? []}
					onChange={(indexes) => updateFilters({ indexes })}
				/>
				<MultiSelectChip
					label="Sector"
					options={SECTORS}
					selected={filters.sectors ?? []}
					onChange={(sectors) => updateFilters({ sectors })}
				/>
				<MultiSelectChip
					label="Analyst rating"
					options={ANALYST_RATINGS}
					selected={filters.ratings ?? []}
					onChange={(ratings) => updateFilters({ ratings })}
					searchable={false}
				/>
				{CONDITION_CHIPS.map((def) => (
					<ConditionChip
						key={def.field}
						def={def}
						value={filters.conditions?.[def.field]}
						onChange={(v) => setCondition(def.field, v)}
					/>
				))}
				<PerfConditionChip
					conditions={filters.conditions}
					setCondition={setCondition}
				/>
				<DateRangeChip
					label="Recent earnings"
					options={RECENT_EARNINGS_OPTIONS}
					value={filters.conditions?.[RECENT_EARNINGS_FIELD]}
					onChange={(v) => setCondition(RECENT_EARNINGS_FIELD, v)}
				/>
				<DateRangeChip
					label="Upcoming earnings"
					options={UPCOMING_EARNINGS_OPTIONS}
					value={filters.conditions?.[UPCOMING_EARNINGS_FIELD]}
					onChange={(v) => setCondition(UPCOMING_EARNINGS_FIELD, v)}
				/>
				{Object.values(filters.custom ?? {}).map((added) => (
					<AddedFilterChip
						key={added.key}
						added={added}
						onRemove={() => removeCustomFilter(added.key)}
					/>
				))}
				<AddFilterMenu added={filters.custom} onAdd={addCustomFilter} />
				{activeFilterCount > 0 && (
					<Button
						variant="ghost"
						size="sm"
						onClick={resetFilters}
						className="h-8 text-muted-foreground hover:bg-muted hover:text-foreground"
					>
						Reset all ({activeFilterCount})
					</Button>
				)}
			</div>

			{/* Tabs */}
			<div className="flex items-center justify-between gap-3 border-b">
				<div className="-mb-px flex self-end overflow-x-auto overflow-y-hidden">
					{SCREENER_TABS.map((t) => (
						<button
							key={t.id}
							type="button"
							onClick={() => changeTab(t.id)}
							className={cn(
								'whitespace-nowrap px-3 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer',
								t.id === tab
									? 'border-primary text-foreground'
									: 'border-transparent text-muted-foreground hover:text-foreground'
							)}
						>
							{t.label}
						</button>
					))}
				</div>
				<div className="flex shrink-0 items-center gap-2 pb-1 text-xs text-muted-foreground">
					<span
						className="hidden lg:flex items-center gap-1.5"
						title={statusDetail}
					>
						<span
							className={cn(
								'size-1.5 rounded-full',
								result.staleSession
									? 'bg-amber-500'
									: marketOpen
									? 'bg-emerald-500'
									: 'bg-muted-foreground/60'
							)}
						/>
						{statusLabel}
					</span>
					<Button
						variant="outline"
						size="icon"
						title="Refresh"
						className="size-8 text-foreground hover:bg-muted hover:text-foreground"
						disabled={isPending}
						onClick={() =>
							load(tab, filters, { force: true, resetPage: false })
						}
					>
						<RefreshCcw
							className={cn('size-4', isPending && 'animate-spin')}
						/>
					</Button>
				</div>
			</div>

			{error && (
				<div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-600">
					Could not load data from TradingView. {error}
				</div>
			)}

			{/* Table */}
			<div className="relative flex-1 min-h-0">
				{/* "auto": scrollbars stay visible whenever the table overflows, not only on hover */}
				<ScrollArea.Root
					type="auto"
					className="h-full w-full rounded-md border border-border overflow-hidden"
				>
					<ScrollArea.Viewport className="h-full w-full">
						<ScreenerTable table={table} />
					</ScrollArea.Viewport>
					<ScrollArea.Scrollbar
						orientation="vertical"
						className="w-1.5 pt-11 pb-1"
					>
						<ScrollArea.Thumb className="bg-muted-foreground dark:bg-primary rounded-full" />
					</ScrollArea.Scrollbar>
					<ScrollArea.Scrollbar
						orientation="horizontal"
						className="flex h-2.5 touch-none select-none border-t bg-muted/60 p-0.5"
					>
						<ScrollArea.Thumb className="relative flex-1 rounded-full bg-muted-foreground/60 hover:bg-muted-foreground dark:bg-primary/70 dark:hover:bg-primary cursor-grab active:cursor-grabbing" />
					</ScrollArea.Scrollbar>
					<ScrollArea.Corner />
				</ScrollArea.Root>

				{isPending && (
					<div className="absolute inset-0 z-40 flex items-center justify-center rounded-md bg-background/40">
						<div className="bg-card border p-3 rounded-lg text-sm flex items-center gap-3 shadow">
							<Spinner size={18} />
							Loading...
						</div>
					</div>
				)}
			</div>

			<DataTablePagination
				currentPage={pagination.pageIndex + 1}
				totalItems={result.rows.length}
				itemsPerPage={pagination.pageSize}
				onPageChange={(page) =>
					setPagination((p) => ({ ...p, pageIndex: page - 1 }))
				}
			/>
		</div>
	);
}
