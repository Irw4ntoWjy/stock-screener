// Columns the user can add to any tab through the "+" button in the table
// header. Curated groups come first (every column the preset tabs already
// know, plus Graham / value); the full TradingView field list is searchable
// underneath (see server/fetch-tradingview-fields.ts).

import { isNum } from './format';
import { ScreenerRow } from './fundamental-page-schema';
import {
	ColumnFormat,
	SCREENER_TABS,
	ScreenerColumn,
} from './screener-config';

export type CatalogGroup = {
	label: string;
	columns: ScreenerColumn[];
};

/**
 * Derived columns, keyed by their `field`. The only arithmetic in the screener
 * that is not TradingView's own: every input is a TradingView field.
 */
const COMPUTED: Record<
	string,
	(row: ScreenerRow) => number | undefined
> = {
	'calc.graham_mos': (row) => {
		const g = row.graham_numbers_ttm;
		const close = row.close;
		return isNum(g) && g > 0 && isNum(close)
			? ((g - close) / g) * 100
			: undefined;
	},
};

const GRAHAM_GROUP: CatalogGroup = {
	label: 'Graham & value',
	columns: [
		{
			field: 'graham_numbers_ttm',
			label: 'Graham number',
			sub: 'TTM',
			format: 'moneyPrecise',
		},
		{
			field: 'graham_numbers_fy',
			label: 'Graham number',
			sub: 'FY',
			format: 'moneyPrecise',
		},
		{
			field: 'calc.graham_mos',
			label: 'Graham MoS %',
			sub: 'TTM',
			format: 'change',
			requires: ['graham_numbers_ttm', 'close'],
		},
		{
			field: 'book_tangible_per_share_fq',
			label: 'Tangible BV / share',
			sub: 'FQ',
			format: 'moneyPrecise',
		},
		{
			field: 'total_shares_outstanding_fundamental',
			label: 'Shares outstanding',
			format: 'auto',
		},
		{
			field: 'float_shares_outstanding',
			label: 'Free float shares',
			format: 'auto',
		},
	],
};

/** Preset tab columns, grouped by the tab they first appear in. */
const tabGroups = (): CatalogGroup[] => {
	const seen = new Set(GRAHAM_GROUP.columns.map((c) => c.field));
	return SCREENER_TABS.map((tab) => ({
		label: tab.label,
		columns: tab.columns.filter((c) => {
			if (seen.has(c.field)) return false;
			seen.add(c.field);
			return true;
		}),
	})).filter((g) => g.columns.length);
};

export const CURATED_GROUPS: CatalogGroup[] = [
	GRAHAM_GROUP,
	...tabGroups(),
];

export const CURATED_FIELDS = new Set(
	CURATED_GROUPS.flatMap((g) => g.columns.map((c) => c.field))
);

// ---- raw TradingView fields -------------------------------------------------

const TYPE_FORMAT: Record<string, ColumnFormat> = {
	fundamental_price: 'fundamental',
	price: 'price',
	percent: 'percent',
	number: 'auto',
	time: 'date',
	text: 'text',
};

const PERIODS: Record<string, string> = {
	fq: 'FQ',
	fy: 'FY',
	fh: 'FH',
	ttm: 'TTM',
	current: 'Current',
	ntm: 'NTM',
};

/** `book_tangible_per_share_fq` -> "Book tangible per share" / "FQ" */
export const rawFieldColumn = (
	name: string,
	type: string
): ScreenerColumn => {
	const parts = name.split(/[_.]/).filter(Boolean);
	const period =
		PERIODS[parts[parts.length - 1]?.toLowerCase() ?? ''];
	if (period && parts.length > 1) parts.pop();
	const text = parts.join(' ');
	return {
		field: name,
		label: text.charAt(0).toUpperCase() + text.slice(1),
		sub: period,
		format: TYPE_FORMAT[type] ?? 'auto',
	};
};

/** Fill derived columns in; returns the rows untouched when there are none. */
export const withComputed = (
	rows: ScreenerRow[],
	columns: ScreenerColumn[]
): ScreenerRow[] => {
	const derived = columns.filter((c) => COMPUTED[c.field]);
	if (!derived.length) return rows;
	return rows.map((row) => {
		const next = { ...row };
		for (const c of derived)
			next[c.field] = COMPUTED[c.field](row);
		return next;
	});
};
