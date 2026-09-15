'use server';

import { fetcher } from '@/lib/fetcher';
import {
	ScanGroup,
	ScanOperand,
	ScanResponse,
	ScreenerFilters,
	ScreenerResult,
	ScreenerRow,
	ScreenerTabId,
	TickerView,
} from '../fundamental-page-schema';
import { getRequestColumns } from '../screener-config';

// TradingView scanner, scoped to IDX by the `indonesia` path segment.
// Called server-side only: no CORS, and one place to cache.
const TRADINGVIEW_SCANNER =
	process.env.TRADINGVIEW_SCANNER_URL ?? 'https://scanner.tradingview.com';
const SCAN_ENDPOINT = '/indonesia/scan?label-product=screener-stock';

// Upstream data is delayed 600s, so a 60s cache costs nothing.
const CACHE_TTL_MS = 60 * 1000;
const CACHE_MAX_ENTRIES = 50;
const cache = new Map<string, ScreenerResult>();

const leaf = (
	left: string,
	operation: string,
	right?: unknown
): ScanOperand => ({ expression: { left, operation, right } });

const hasItems = (arr?: unknown[]): arr is unknown[] =>
	Array.isArray(arr) && arr.length > 0;

const buildFilter = (filters: ScreenerFilters): ScanGroup => {
	// Always-on universe: primary listings of stocks (drops ETFs / funds).
	const operands: ScanOperand[] = [
		leaf('is_primary', 'equal', true),
		leaf('type', 'equal', 'stock'),
	];

	const search = filters.search?.trim();
	if (search) operands.push(leaf('name,description', 'match', search));

	if (hasItems(filters.sectors))
		operands.push(leaf('sector', 'in_range', filters.sectors));

	if (hasItems(filters.ratings))
		operands.push(leaf('AnalystRating', 'in_range', filters.ratings));

	for (const [field, range] of Object.entries(filters.ranges ?? {})) {
		const hasMin = typeof range.min === 'number' && !isNaN(range.min);
		const hasMax = typeof range.max === 'number' && !isNaN(range.max);
		if (hasMin && hasMax)
			operands.push(leaf(field, 'in_range', [range.min, range.max]));
		else if (hasMin) operands.push(leaf(field, 'egreater', range.min));
		else if (hasMax) operands.push(leaf(field, 'eless', range.max));
	}

	if (typeof filters.recentEarningsDays === 'number')
		operands.push(
			leaf('earnings_release_date', 'in_day_range', [
				-filters.recentEarningsDays,
				0,
			])
		);

	if (typeof filters.upcomingEarningsDays === 'number')
		operands.push(
			leaf('earnings_release_next_date', 'in_day_range', [
				0,
				filters.upcomingEarningsDays,
			])
		);

	return { operator: 'and', operands };
};

const toRows = (
	res: ScanResponse,
	columns: string[]
): ScreenerRow[] =>
	(res.data ?? []).map(({ s, d }) => {
		const row: ScreenerRow = {
			symbol: s,
			ticker: s.split(':').pop() ?? s,
		};
		columns.forEach((col, i) => {
			// null -> undefined so TanStack's sortUndefined keeps blanks last
			row[col] = d[i] ?? undefined;
		});
		const view = row['ticker-view'] as TickerView | undefined;
		if (typeof row.name !== 'string' && view?.name)
			row.name = view.name;
		if (typeof row.description !== 'string' && view?.description)
			row.description = view.description;
		if (typeof row.logoid !== 'string' && view?.logo?.logoid)
			row.logoid = view.logo.logoid;
		return row;
	});

/**
 * Index membership is not a filter2 expression: `index has [...]` always
 * returns 0 rows. TradingView restricts to index constituents through
 * `symbols.symbolset` with ids like `SYML:IDX;LQ45`. Several sets = union,
 * and it is AND-ed with filter2.
 */
const toSymbolset = (indexes?: string[]) =>
	hasItems(indexes)
		? indexes.map((id) => {
				const [exchange, name] = id.split(':');
				return `SYML:${exchange};${name}`;
		  })
		: undefined;

/**
 * Fetch the whole filtered IDX universe (~900 rows max) for one tab.
 * Sorting and paging happen client-side.
 */
export async function scanIdxStocks({
	tab,
	filters = {},
	force = false,
}: {
	tab: ScreenerTabId;
	filters?: ScreenerFilters;
	force?: boolean;
}): Promise<ScreenerResult> {
	const key = JSON.stringify({ tab, filters });
	const hit = cache.get(key);
	if (!force && hit && Date.now() - hit.fetchedAt < CACHE_TTL_MS) {
		return hit;
	}

	const columns = getRequestColumns(tab);
	const symbolset = toSymbolset(filters.indexes);
	const payload = {
		columns,
		filter2: buildFilter(filters),
		...(symbolset && { symbols: { symbolset } }),
		markets: ['indonesia'],
		options: { lang: 'en' },
		sort: {
			sortBy: 'market_cap_basic',
			sortOrder: 'desc',
			nullsFirst: false,
		},
		// strict in dev (typo'd field -> 400), lenient in prod so one
		// retired field does not blank the whole table
		ignore_unknown_fields: process.env.NODE_ENV === 'production',
	};

	const res = await fetcher<ScanResponse>(SCAN_ENDPOINT, {
		baseUrl: TRADINGVIEW_SCANNER,
		method: 'POST',
		body: JSON.stringify(payload),
	});

	if (res.error) {
		throw new Error(`TradingView scanner error: ${res.error}`);
	}

	const result: ScreenerResult = {
		rows: toRows(res, columns),
		totalCount: res.totalCount ?? 0,
		fetchedAt: Date.now(),
	};

	if (cache.size >= CACHE_MAX_ENTRIES) {
		const oldest = cache.keys().next().value;
		if (oldest !== undefined) cache.delete(oldest);
	}
	cache.set(key, result);

	return result;
}
