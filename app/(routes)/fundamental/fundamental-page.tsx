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
import { useMemo, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
	ScreenerTable,
	useScreenerTable,
} from './component/screener-table';
import {
	DaysChip,
	MultiSelectChip,
	RangeChip,
} from './component/filter-chips';
import { formatUnixDate, ratingLabel } from './format';
import {
	RangeValue,
	ScreenerFilters,
	ScreenerResult,
	ScreenerRow,
	ScreenerTabId,
} from './fundamental-page-schema';
import {
	ANALYST_RATINGS,
	EARNINGS_DAY_OPTIONS,
	getTab,
	INDEXES,
	RANGE_CHIPS,
	SCREENER_TABS,
	ScreenerColumn,
	SECTORS,
} from './screener-config';
import { scanIdxStocks } from './server/fetch-fundamental-data';
import { getFundamentalColumns } from './table-config';

const PAGE_SIZE = 50;
const DEFAULT_SORT: SortingState = [
	{ id: 'market_cap_basic', desc: true },
];

interface FundamentalPageProps {
	initialData: ScreenerResult;
	initialError?: string;
}

const hasColumn = (tab: ScreenerTabId, id: string) =>
	id === 'symbol' || getTab(tab).columns.some((c) => c.field === id);

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
		case 'date':
			return formatUnixDate(v) ?? '';
		default:
			return typeof v === 'number' ? v : '';
	}
};

export default function FundamentalPage({
	initialData,
	initialError,
}: FundamentalPageProps) {
	const [tab, setTab] = useState<ScreenerTabId>('overview');
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

	const load = (
		nextTab: ScreenerTabId,
		nextFilters: ScreenerFilters,
		{ force = false, resetPage = true } = {}
	) => {
		const id = ++requestId.current;
		startTransition(async () => {
			try {
				const data = await scanIdxStocks({
					tab: nextTab,
					filters: nextFilters,
					force,
				});
				if (id !== requestId.current) return; // a newer request won
				setResult(data);
				setError(undefined);
				if (resetPage)
					setPagination((p) => ({ ...p, pageIndex: 0 }));
			} catch (e) {
				if (id !== requestId.current) return;
				const message =
					e instanceof Error ? e.message : 'Failed to load data';
				setError(message);
				toast.error('Failed to load screener data from TradingView');
			}
		});
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

	const setRange = (field: string, value: RangeValue | undefined) => {
		const ranges = { ...(filtersRef.current.ranges ?? {}) };
		if (value) ranges[field] = value;
		else delete ranges[field];
		updateFilters({ ranges });
	};

	const changeTab = (next: ScreenerTabId) => {
		if (next === tab) return;
		setTab(next);
		tabRef.current = next;
		// keep the sort if the new tab still has that column
		setSorting((s) => s.filter((x) => hasColumn(next, x.id)));
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
		Object.keys(filters.ranges ?? {}).length +
		(filters.recentEarningsDays !== undefined ? 1 : 0) +
		(filters.upcomingEarningsDays !== undefined ? 1 : 0);

	const resetFilters = () => {
		setSearch('');
		filtersRef.current = {};
		setFilters({});
		load(tabRef.current, {});
	};

	const columns = useMemo(
		() => getFundamentalColumns(tab, result.totalCount),
		[tab, result.totalCount]
	);

	const table = useScreenerTable({
		columns,
		data: result.rows,
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
				...current.columns.map((col) => ({
					header: col.sub ? `${col.label} (${col.sub})` : col.label,
					width: col.width ?? 16,
					value: (r: ScreenerRow) => exportValue(col, r),
					cellStyle: ['text', 'rating', 'patterns', 'date'].includes(
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

	const updatedAt = new Date(result.fetchedAt).toLocaleTimeString(
		'en-GB',
		{ hour: '2-digit', minute: '2-digit' }
	);

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
					options={SECTORS.map((s) => ({ value: s, label: s }))}
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
				{RANGE_CHIPS.map((chip) => (
					<RangeChip
						key={chip.field}
						chip={chip}
						value={filters.ranges?.[chip.field]}
						onChange={(v) => setRange(chip.field, v)}
					/>
				))}
				<DaysChip
					label="Recent earnings"
					prefix="Past"
					options={EARNINGS_DAY_OPTIONS}
					value={filters.recentEarningsDays}
					onChange={(recentEarningsDays) =>
						updateFilters({ recentEarningsDays })
					}
				/>
				<DaysChip
					label="Upcoming earnings"
					prefix="Next"
					options={EARNINGS_DAY_OPTIONS}
					value={filters.upcomingEarningsDays}
					onChange={(upcomingEarningsDays) =>
						updateFilters({ upcomingEarningsDays })
					}
				/>
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
				<div className="flex overflow-x-auto">
					{SCREENER_TABS.map((t) => (
						<button
							key={t.id}
							type="button"
							onClick={() => changeTab(t.id)}
							className={cn(
								'whitespace-nowrap px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer',
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
					<span className="hidden lg:inline">
						Updated {updatedAt}
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
				<ScrollArea.Root className="h-full w-full rounded-md border border-border overflow-hidden">
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
						className="h-1.5"
					>
						<ScrollArea.Thumb className="bg-muted-foreground dark:bg-primary rounded-full" />
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
