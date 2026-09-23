'use server';

import { fetcher } from '@/lib/fetcher';

const TRADINGVIEW_SCANNER =
	process.env.TRADINGVIEW_SCANNER_URL ??
	'https://scanner.tradingview.com';
const METAINFO_ENDPOINT = '/indonesia/metainfo';

// The field list only changes when TradingView ships new columns.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Scanner types a table cell can render; maps, slices and sets are not scalars. */
const RENDERABLE_TYPES = new Set([
	'fundamental_price',
	'price',
	'percent',
	'number',
	'time',
	'text',
]);

export type TradingViewField = { name: string; type: string };

type MetainfoResponse = {
	fields?: { n: string; t: string }[];
	error?: string;
};

let cached:
	{ fields: TradingViewField[]; fetchedAt: number } | undefined;

/**
 * Every column TradingView's IDX scanner serves, for the "+" column picker.
 * Timeframe variants (`RSI|60`) are left out; the base field is the daily one.
 */
export async function getTradingViewFields(): Promise<
	TradingViewField[]
> {
	if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS)
		return cached.fields;

	const res = await fetcher<MetainfoResponse>(
		METAINFO_ENDPOINT,
		{
			baseUrl: TRADINGVIEW_SCANNER,
			method: 'POST',
			body: JSON.stringify({ columns: [] }),
		}
	);

	if (res.error || !res.fields)
		throw new Error(
			`TradingView metainfo error: ${res.error ?? 'no fields'}`
		);

	const fields = res.fields
		.filter(
			(f) => !f.n.includes('|') && RENDERABLE_TYPES.has(f.t)
		)
		.map((f) => ({ name: f.n, type: f.t }))
		.sort((a, b) => a.name.localeCompare(b.name));

	cached = { fields, fetchedAt: Date.now() };
	return fields;
}
