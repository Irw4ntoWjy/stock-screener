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
	| 'pershare';

export type RangeValue = { min?: number; max?: number };

/** Everything the user can filter on. Serialisable so it can cross the server-action boundary. */
export type ScreenerFilters = {
	search?: string;
	indexes?: string[];
	sectors?: string[];
	ratings?: string[];
	ranges?: Record<string, RangeValue>; // keyed by TradingView field
	recentEarningsDays?: number;
	upcomingEarningsDays?: number;
};

export type ScreenerResult = {
	rows: ScreenerRow[];
	totalCount: number;
	fetchedAt: number; // epoch ms
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
