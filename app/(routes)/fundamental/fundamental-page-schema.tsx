// Types for the TradingView scanner (IDX) used by the fundamental screener.

export type TickerView = {
	name: string;
	description?: string;
	exchange?: string;
	type?: string;
	typespecs?: string[];
	logo?: { logoid?: string; style?: string } | null;
};

/** One row, zipped from the positional `d` array against the requested columns. */
export type ScreenerRow = {
	symbol: string; // "IDX:BBCA"
	ticker: string; // "BBCA"
	[field: string]: unknown;
};

export type ScreenerTabId =
	| 'overview'
	| 'performance'
	| 'technicals'
	| 'extended'
	| 'forecasts'
	| 'valuation'
	| 'dividends'
	| 'profitability'
	| 'income'
	| 'balance'
	| 'cashflow'
	| 'pershare'
	| 'custom';

/** A single filter2 leaf: `{left: field, operation, right}` without the field name. */
export type ConditionValue = {
	operation: string;
	right: number | number[] | string;
};

/** A filter added through the "+ Add filter" catalog picker; see add-filter-catalog.ts. */
export type AddedFilter = {
	key: string; // catalog filter key, e.g. "RSI"
	label: string; // catalog filter label, e.g. "Relative Strength Index"
	summary: string; // chip value text, e.g. "1 hour · Above 70"
	expr: { left: string; operation: string; right: unknown };
};

/** Everything the user can filter on. Serialisable so it can cross the server-action boundary. */
export type ScreenerFilters = {
	search?: string;
	indexes?: string[];
	sectors?: string[];
	ratings?: string[];
	conditions?: Record<string, ConditionValue>; // keyed by TradingView field
	custom?: Record<string, AddedFilter>; // keyed by catalog filter key, from "+ Add filter"
};

export type ScreenerResult = {
	rows: ScreenerRow[];
	totalCount: number;
	fetchedAt: number; // epoch ms
	/** Unix seconds of the daily bar upstream returned; the session the rows belong to. */
	marketTime?: number;
	/** Upstream feed mode, e.g. "delayed_streaming_600" / "eod". */
	updateMode?: string;
	/** Upstream is still on an earlier session's bar, so SESSION_FIELDS are blank. */
	staleSession: boolean;
};

// ---- raw TradingView scanner wire types ----

export type ScanExpression = {
	left: string;
	operation: string;
	right?: unknown;
};

export type ScanOperand =
	| { expression: ScanExpression }
	| { operation: ScanGroup };

export type ScanGroup = {
	operator: 'and' | 'or';
	operands: ScanOperand[];
};

export type ScanResponse = {
	totalCount: number;
	data: { s: string; d: unknown[] }[] | null;
	error?: string;
};
