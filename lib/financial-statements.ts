// Client-safe helpers shared by the navbar notifications and the company
// profile's Financial Statements tab.

/** Fired on window whenever statements are marked read, so the bell refetches. */
export const STATEMENTS_CHANGED_EVENT = 'financial-statements:changed';

export const notifyStatementsChanged = () =>
	window.dispatchEvent(new Event(STATEMENTS_CHANGED_EVENT));

/** Same wording as the statement cards: "Laporan Keuangan Tahun 2025 Periode Triwulan 3". */
export const statementTitle = (s: { reportYear: number; period: string }) =>
	`Laporan Keuangan Tahun ${s.reportYear} Periode ${s.period}`;

/** Where a notification leads: the company's Financial Statements tab. */
export const statementHref = (s: { stockCode: string; id?: string }) =>
	`/company-profile/${s.stockCode}?from=notification&tab=financial-statement${
		s.id ? `&statement=${encodeURIComponent(s.id)}` : ''
	}`;

/** The backend sends UTC without a trailing "Z"; without it JS reads local time. */
export const parseUtc = (value?: string | null) => {
	if (!value) return undefined;
	const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);
	return Number.isNaN(d.getTime()) ? undefined : d;
};

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
	['year', 365 * 24 * 3600],
	['month', 30 * 24 * 3600],
	['week', 7 * 24 * 3600],
	['day', 24 * 3600],
	['hour', 3600],
	['minute', 60],
];

/** "12 hours ago", "yesterday", "just now". */
export const timeAgo = (date: Date, now = Date.now()) => {
	const seconds = Math.round((date.getTime() - now) / 1000);
	for (const [unit, size] of STEPS)
		if (Math.abs(seconds) >= size)
			return rtf.format(Math.round(seconds / size), unit);
	return 'just now';
};
