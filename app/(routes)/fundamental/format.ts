import { ScreenerRow } from './fundamental-page-schema';

const isNum = (v: unknown): v is number =>
	typeof v === 'number' && Number.isFinite(v);

const fmt = (n: number, min: number, max: number) =>
	n.toLocaleString('en-US', {
		minimumFractionDigits: min,
		maximumFractionDigits: max,
	});

/** Decimals shown for a quote price: log10(pricescale). IDX is usually 0. */
export const priceDecimals = (row: ScreenerRow) => {
	const scale = row.pricescale;
	return isNum(scale) && scale > 0
		? Math.max(0, Math.round(Math.log10(scale)))
		: 0;
};

const UNITS = [
	{ v: 1e12, s: 'T' },
	{ v: 1e9, s: 'B' },
	{ v: 1e6, s: 'M' },
	{ v: 1e3, s: 'K' },
];

/** 779714671484375 -> "779.71 T" */
export const abbreviate = (n: number) => {
	const abs = Math.abs(n);
	for (const u of UNITS) {
		if (abs >= u.v) return `${fmt(n / u.v, 2, 2)} ${u.s}`;
	}
	return fmt(n, 0, 2);
};

/** "10T", "500 b", "1.5m", "2,000" -> number. Returns undefined when empty/invalid. */
export const parseAbbreviated = (raw: string): number | undefined => {
	const s = raw.trim().replace(/,/g, '').toUpperCase();
	if (!s) return undefined;
	const m = s.match(/^(-?\d*\.?\d+)\s*([KMBT])?$/);
	if (!m) return undefined;
	const mult = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 }[
		m[2] as 'K' | 'M' | 'B' | 'T'
	];
	return parseFloat(m[1]) * (mult ?? 1);
};

export const formatPrice = (n: number, row: ScreenerRow) =>
	fmt(n, priceDecimals(row), priceDecimals(row));

export const formatPercent = (n: number, signed = false) =>
	`${signed && n > 0 ? '+' : ''}${fmt(n, 2, 2)}%`;

export const formatNumber = (n: number) => fmt(n, 2, 2);

export const formatInteger = (n: number) => fmt(n, 0, 0);

export const formatUnixDate = (v: unknown) => {
	if (!isNum(v)) return undefined;
	// unix seconds, but tolerate yyyymmdd integers
	if (v > 19000101 && v < 21001231) {
		const s = String(v);
		return new Date(
			`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T00:00:00Z`
		).toLocaleDateString('en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
		});
	}
	return new Date(v * 1000).toLocaleDateString('en-GB', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	});
};

/** Ordinal used to sort rating columns (Strong buy first when descending). */
const RATING_ORDER: Record<string, number> = {
	StrongBuy: 5,
	Buy: 4,
	Neutral: 3,
	Sell: 2,
	StrongSell: 1,
	NoRating: 0,
};

export const ratingRank = (v: unknown) =>
	typeof v === 'string' ? RATING_ORDER[v] ?? 0 : undefined;

/** Split a CamelCase rating into display text: StrongBuy -> Strong buy */
export const ratingLabel = (v: unknown) => {
	if (typeof v !== 'string') return undefined;
	if (v === 'NoRating') return 'No rating';
	return v.replace(/([a-z])([A-Z])/g, '$1 $2').replace(
		/ (\w)/,
		(_, c: string) => ` ${c.toLowerCase()}`
	);
};

export { isNum };
