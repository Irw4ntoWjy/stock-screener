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
import { getRequestColumns, SESSION_FIELDS } from '../screener-config';
import { isStaleSession } from '../market-hours';

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

// Added-column fields come from the browser, so only plain field names pass.
const FIELD_NAME = /^[A-Za-z0-9_.-]+$/;
const MAX_EXTRA_FIELDS = 60;

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

	for (const [field, condition] of Object.entries(filters.conditions ?? {}))
		operands.push(leaf(field, condition.operation, condition.right));

	for (const added of Object.values(filters.custom ?? {}))
		operands.push(leaf(added.expr.left, added.expr.operation, added.expr.right));

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
	extraFields = [],
	force = false,
}: {
	tab: ScreenerTabId;
	filters?: ScreenerFilters;
	/** Fields for columns the user added on top of the tab's own. */
	extraFields?: string[];
	force?: boolean;
}): Promise<ScreenerResult> {
	const extras = [...new Set(extraFields)]
		.filter((f) => FIELD_NAME.test(f))
		.sort()
		.slice(0, MAX_EXTRA_FIELDS);
	const key = JSON.stringify({ tab, filters, extras });
	const hit = cache.get(key);
	if (!force && hit && Date.now() - hit.fetchedAt < CACHE_TTL_MS) {
		return hit;
	}

	const columns = getRequestColumns(tab, extras);
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

	const rows = toRows(res, columns);
	// Every row carries the same daily-bar stamp, so the first one that has it
	// dates the whole result.
	const stamped = rows.find((r) => typeof r.time === 'number');
	const marketTime = stamped?.time as number | undefined;

	// Dropped at the source rather than in the cell renderer, so sorting, the
	// row count and the Excel export all agree with what is on screen.
	const staleSession = isStaleSession(marketTime);
	if (staleSession)
		for (const row of rows)
			for (const field of SESSION_FIELDS) row[field] = undefined;

	const result: ScreenerResult = {
		rows,
		totalCount: res.totalCount ?? 0,
		fetchedAt: Date.now(),
		marketTime,
		staleSession,
		updateMode:
			typeof stamped?.update_mode === 'string'
				? stamped.update_mode
				: undefined,
	};

	if (cache.size >= CACHE_MAX_ENTRIES) {
		const oldest = cache.keys().next().value;
		if (oldest !== undefined) cache.delete(oldest);
	}
	cache.set(key, result);

	return result;
}
