// IDX session helpers. The exchange runs on WIB no matter where the browser or
// the server sits, so every check below formats through an explicit time zone —
// that also keeps SSR output and hydration identical.

export const MARKET_TZ = 'Asia/Jakarta';

const clockParts = new Intl.DateTimeFormat('en-US', {
	timeZone: MARKET_TZ,
	weekday: 'short',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23',
});

const TRADING_DAYS = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);

/**
 * Pre-opening starts 08:45 and post-trading ends 16:15; the feed is delayed
 * ~10 min on top of that, so the day's last prints land shortly after.
 */
const OPEN_MINUTE = 8 * 60 + 45;
const CLOSE_MINUTE = 16 * 60 + 30;

/**
 * Whether IDX is inside a trading session right now. Exchange holidays are not
 * known here, so a holiday reads as open — the only cost is a poll that comes
 * back with the same rows.
 */
export const isMarketHours = (at: Date = new Date()) => {
	const parts = clockParts.formatToParts(at);
	const part = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((p) => p.type === type)?.value ?? '';

	if (!TRADING_DAYS.has(part('weekday'))) return false;

	const minutes = Number(part('hour')) * 60 + Number(part('minute'));
	return minutes >= OPEN_MINUTE && minutes < CLOSE_MINUTE;
};

const timeFormat = new Intl.DateTimeFormat('en-GB', {
	timeZone: MARKET_TZ,
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23',
});

const dateFormat = new Intl.DateTimeFormat('en-GB', {
	timeZone: MARKET_TZ,
	day: '2-digit',
	month: 'short',
});

/** Epoch ms -> "01:17" WIB. */
export const formatMarketTime = (epochMs: number) =>
	timeFormat.format(new Date(epochMs));

/**
 * Daily-bar stamp (unix seconds) -> "21 Sep". TradingView stamps the bar at the
 * session's start, so the WIB calendar day it falls in is the trading day.
 */
export const formatMarketDate = (epochSeconds: number) =>
	dateFormat.format(new Date(epochSeconds * 1000));

const isoDay = new Intl.DateTimeFormat('en-CA', {
	timeZone: MARKET_TZ,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
});

/** WIB calendar day of an instant, as "2026-09-22". */
export const marketDay = (at: Date) => isoDay.format(at);

/** Today's trading day, formatted for display: "22 Sept". */
export const todayMarketDate = () => dateFormat.format(new Date());

/**
 * True when the daily bar upstream returned belongs to an earlier session than
 * today's — overnight, at a weekend, and between the open and the first prints
 * clearing the ~10 min delay.
 *
 * There is no feed for "today's change" until today actually trades, so the
 * intraday columns are blanked in this state rather than carrying last
 * session's move, which is what made an overnight screen look live.
 */
export const isStaleSession = (marketTime?: number, now: Date = new Date()) =>
	typeof marketTime !== 'number' ||
	marketDay(new Date(marketTime * 1000)) !== marketDay(now);
