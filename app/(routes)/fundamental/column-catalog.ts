// Columns the user can add to any tab through the "+" button in the table
// header: TradingView's own column picker, category for category (see
// tradingview-columns.ts), plus derived columns under "Custom". The full
// TradingView field list stays searchable underneath (see
// server/fetch-tradingview-fields.ts).

import { isNum } from './format';
import { ScreenerRow } from './fundamental-page-schema';
import { ColumnFormat, ScreenerColumn } from './screener-config';
import { TV_CATEGORIES, TvCategory } from './tradingview-columns';

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

const CUSTOM_CATEGORY: TvCategory = {
	id: 'custom',
	label: 'Custom',
	sections: [
		{
			columns: [
				{
					id: 'GrahamMos',
					label: 'Graham MoS %',
					variants: [
						{
							field: 'calc.graham_mos',
							label: 'Graham MoS %',
							sub: 'TTM',
							format: 'change',
							requires: ['graham_numbers_ttm', 'close'],
						},
					],
				},
			],
		},
	],
};

export const CATALOG: TvCategory[] = [...TV_CATEGORIES, CUSTOM_CATEGORY];

export const catalogColumns = (category: TvCategory) =>
	category.sections.flatMap((s) => s.columns);

export const CATALOG_FIELDS = new Set(
	CATALOG.flatMap((c) =>
		catalogColumns(c).flatMap((col) => col.variants.map((v) => v.field))
	)
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
