import { ScreenerTabId } from './fundamental-page-schema';

/**
 * How a value is rendered.
 * - price:        quote price, decimals from `pricescale`, `IDR` suffix
 * - change:       percent, coloured by sign
 * - percent:      percent, neutral colour
 * - volume:       abbreviated count (K/M/B/T), no currency
 * - money:        abbreviated amount + fundamental currency (e.g. 779.71 T IDR)
 * - moneyPrecise: 2-decimal amount + fundamental currency (e.g. 471.83 IDR)
 * - number:       2-decimal number
 * - integer:      whole number
 * - rating:       TradingView rating text (Strong buy / Buy / ...)
 * - text:         plain string
 * - date:         unix seconds -> date
 * - patterns:     candlestick pattern list
 * - lot:          share volume shown in IDX lots (÷ 100)
 * - indexes:      IDX index membership codes (IDX30, LQ45, ...)
 * - fundamental:  amount + fundamental currency, abbreviated from 1M up
 * - auto:         number, abbreviated from 1M up
 */
export type ColumnFormat =
	| 'price'
	| 'change'
	| 'percent'
	| 'volume'
	| 'money'
	| 'moneyPrecise'
	| 'number'
	| 'integer'
	| 'rating'
	| 'text'
	| 'date'
	| 'patterns'
	| 'lot'
	| 'indexes'
	| 'fundamental'
	| 'auto';

export type ScreenerColumn = {
	/** TradingView field requested and read from the row. */
	field: string;
	label: string;
	/** Small second line under the header, e.g. "TTM" / "TTM YoY". */
	sub?: string;
	format: ColumnFormat;
	/** Field holding the display text (e.g. `sector.tr`), sorted by `field`. */
	displayField?: string;
	width?: number; // excel column width
	/**
	 * Derived column (see column-catalog.ts): these TradingView fields are
	 * requested instead of `field`, and `field` is filled in client-side.
	 */
	requires?: string[];
};

export type ScreenerTab = {
	id: ScreenerTabId;
	label: string;
	columns: ScreenerColumn[];
};

/** Always requested: symbol cell, formatting, row-state and session-stamp columns. */
export const BASE_COLUMNS = [
	'ticker-view',
	'name',
	'description',
	'logoid',
	'type',
	'typespecs',
	'pricescale',
	'minmov',
	'fractional',
	'minmove2',
	'currency',
	'fundamental_currency_code',
	'active_symbol',
	// Not rendered as columns: they tell the UI which session the rows are from,
	// which the fetch time alone cannot (outside hours the numbers are last close).
	'time',
	'update_mode',
];

const price: ScreenerColumn = {
	field: 'close',
	label: 'Price',
	format: 'price',
};
const change: ScreenerColumn = {
	field: 'change',
	label: 'Chg %',
	format: 'change',
};
const marketCap: ScreenerColumn = {
	field: 'market_cap_basic',
	label: 'Mkt cap',
	format: 'money',
	width: 20,
};
const peTtm: ScreenerColumn = {
	field: 'price_earnings_ttm',
	label: 'P/E',
	format: 'number',
};
const epsDil: ScreenerColumn = {
	field: 'earnings_per_share_diluted_ttm',
	label: 'EPS dil',
	sub: 'TTM',
	format: 'moneyPrecise',
};
const epsDilGrowth: ScreenerColumn = {
	field: 'earnings_per_share_diluted_yoy_growth_ttm',
	label: 'EPS dil growth',
	sub: 'TTM YoY',
	format: 'change',
};
const fiscalPeriod: ScreenerColumn = {
	field: 'fiscal_period_current',
	label: 'Fiscal period',
	format: 'text',
};
const fiscalPeriodEnd: ScreenerColumn = {
	field: 'fiscal_period_end_current',
	label: 'Period end',
	format: 'date',
};

export const SCREENER_TABS: ScreenerTab[] = [
	{
		// IDX-style layout; every value is TradingView's own field, unmodified
		// apart from volume shown in lots.
		id: 'custom',
		label: 'Custom',
		columns: [
			{
				field: 'sector',
				displayField: 'sector.tr',
				label: 'Sector',
				format: 'text',
				width: 24,
			},
			{
				field: 'industry',
				displayField: 'industry.tr',
				label: 'Sub industry',
				format: 'text',
				width: 28,
			},
			{
				field: 'indexes',
				label: 'Stock class',
				format: 'indexes',
				width: 40,
			},
			marketCap,
			{ field: 'volume', label: 'Vol', sub: 'Lot', format: 'lot' },
			price,
			{
				field: 'book_value_per_share_fq',
				label: 'BV',
				sub: 'FQ',
				format: 'moneyPrecise',
			},
			{
				field: 'price_book_fq',
				label: 'PBV',
				sub: 'FQ',
				format: 'number',
			},
			peTtm,
			{
				field: 'earnings_per_share_basic_ttm',
				label: 'EPS',
				sub: 'TTM',
				format: 'moneyPrecise',
			},
			{
				field: 'debt_to_equity_fq',
				label: 'DER',
				sub: 'FQ',
				format: 'number',
			},
			{
				field: 'return_on_assets_fq',
				label: 'ROA %',
				sub: 'FQ',
				format: 'percent',
			},
			{
				field: 'return_on_equity_fq',
				label: 'ROE %',
				sub: 'FQ',
				format: 'percent',
			},
			{
				field: 'net_margin_ttm',
				label: 'NPM %',
				sub: 'TTM',
				format: 'percent',
			},
		],
	},
	{
		id: 'overview',
		label: 'Overview',
		columns: [
			price,
			change,
			{ field: 'volume', label: 'Vol', format: 'volume' },
			{
				field: 'relative_volume_10d_calc',
				label: 'Rel vol',
				format: 'number',
			},
			marketCap,
			peTtm,
			epsDil,
			epsDilGrowth,
			{
				field: 'dividends_yield_current',
				label: 'Div yield %',
				sub: 'TTM',
				format: 'percent',
			},
			{
				field: 'sector',
				displayField: 'sector.tr',
				label: 'Sector',
				format: 'text',
				width: 24,
			},
			{
				field: 'AnalystRating',
				displayField: 'AnalystRating.tr',
				label: 'Analyst rating',
				format: 'rating',
				width: 14,
			},
		],
	},
	{
		id: 'performance',
		label: 'Performance',
		columns: [
			price,
			change,
			{ field: 'Perf.W', label: 'Perf %', sub: '1W', format: 'change' },
			{ field: 'Perf.1M', label: 'Perf %', sub: '1M', format: 'change' },
			{ field: 'Perf.3M', label: 'Perf %', sub: '3M', format: 'change' },
			{ field: 'Perf.6M', label: 'Perf %', sub: '6M', format: 'change' },
			{ field: 'Perf.YTD', label: 'Perf %', sub: 'YTD', format: 'change' },
			{ field: 'Perf.Y', label: 'Perf %', sub: '1Y', format: 'change' },
			{ field: 'Perf.5Y', label: 'Perf %', sub: '5Y', format: 'change' },
			{ field: 'Perf.10Y', label: 'Perf %', sub: '10Y', format: 'change' },
			{
				field: 'Perf.All',
				label: 'Perf %',
				sub: 'All Time',
				format: 'change',
			},
			{
				field: 'Volatility.W',
				label: 'Volatility',
				sub: '1W',
				format: 'percent',
			},
			{
				field: 'Volatility.M',
				label: 'Volatility',
				sub: '1M',
				format: 'percent',
			},
		],
	},
	{
		id: 'technicals',
		label: 'Technicals',
		columns: [
			{
				field: 'TechRating_1D',
				displayField: 'TechRating_1D.tr',
				label: 'Tech Rating',
				sub: '1D',
				format: 'rating',
			},
			{
				field: 'MARating_1D',
				displayField: 'MARating_1D.tr',
				label: 'MA Rating',
				sub: '1D',
				format: 'rating',
			},
			{
				field: 'OsRating_1D',
				displayField: 'OsRating_1D.tr',
				label: 'Os Rating',
				sub: '1D',
				format: 'rating',
			},
			{ field: 'RSI', label: 'RSI', sub: '14', format: 'number' },
			{ field: 'Mom', label: 'Mom', sub: '10', format: 'number' },
			{ field: 'AO', label: 'AO', format: 'number' },
			{ field: 'CCI20', label: 'CCI', sub: '20', format: 'number' },
			{ field: 'Stoch.K', label: 'Stoch %K', format: 'number' },
			{ field: 'Stoch.D', label: 'Stoch %D', format: 'number' },
			{
				field: 'candlestick_patterns_1D',
				label: 'Patterns',
				sub: '1D',
				format: 'patterns',
				width: 24,
			},
		],
	},
	{
		// IDX has no post-market session on this feed, so only pre-market columns.
		id: 'extended',
		label: 'Extended hours',
		columns: [
			{
				field: 'premarket_close',
				label: 'Pre-market',
				sub: 'Price',
				format: 'price',
			},
			{
				field: 'premarket_change',
				label: 'Pre-market',
				sub: 'Chg %',
				format: 'change',
			},
			{
				field: 'premarket_gap',
				label: 'Pre-market',
				sub: 'Gap %',
				format: 'change',
			},
			{
				field: 'premarket_volume',
				label: 'Pre-market',
				sub: 'Vol',
				format: 'volume',
			},
			price,
			change,
			{ field: 'gap', label: 'Gap %', format: 'change' },
			{ field: 'volume', label: 'Vol', format: 'volume' },
			{ field: 'volume_change', label: 'Vol chg %', format: 'change' },
		],
	},
	{
		id: 'forecasts',
		label: 'Forecasts',
		columns: [
			marketCap,
			price,
			{
				field: 'earnings_per_share_forecast_next_fy',
				label: 'EPS forecast',
				sub: 'FY',
				format: 'moneyPrecise',
			},
			{
				field: 'revenue_forecast_next_fy',
				label: 'Revenue forecast',
				sub: 'FY',
				format: 'money',
			},
			{
				field: 'net_income_estimate_ntm',
				label: 'Net income est.',
				sub: 'NTM',
				format: 'money',
			},
			{
				field: 'free_cash_flow_estimate_ntm',
				label: 'FCF est.',
				sub: 'NTM',
				format: 'money',
			},
			{
				field: 'price_earnings_fwd',
				label: 'Fwd P/E',
				format: 'number',
			},
			{
				field: 'enterprise_value_ebitda_fwd',
				label: 'Fwd EV/EBITDA',
				format: 'number',
			},
			{
				field: 'price_sales_fwd',
				label: 'Fwd P/S',
				format: 'number',
			},
			{
				field: 'total_debt_estimate_fy',
				label: 'Total debt est.',
				sub: 'FY',
				format: 'money',
			},
			{
				field: 'book_value_per_share_estimate_fy',
				label: 'BVPS est.',
				sub: 'FY',
				format: 'moneyPrecise',
			},
			{
				field: 'dps_estimate_ntm',
				label: 'DPS est.',
				sub: 'NTM',
				format: 'moneyPrecise',
			},
		],
	},
	{
		id: 'valuation',
		label: 'Valuation',
		columns: [
			marketCap,
			{
				field: 'Perf.1Y.MarketCap',
				label: 'Mkt cap perf %',
				sub: '1Y',
				format: 'change',
			},
			peTtm,
			{
				field: 'price_earnings_growth_ttm',
				label: 'PEG',
				sub: 'TTM',
				format: 'number',
			},
			{ field: 'price_sales_current', label: 'P/S', format: 'number' },
			{ field: 'price_book_fq', label: 'P/B', sub: 'FQ', format: 'number' },
			{
				field: 'price_to_cash_f_operating_activities_ttm',
				label: 'P/CF',
				sub: 'TTM',
				format: 'number',
			},
			{
				field: 'price_free_cash_flow_ttm',
				label: 'P/FCF',
				sub: 'TTM',
				format: 'number',
			},
			{
				field: 'price_to_cash_ratio',
				label: 'P/Cash',
				format: 'number',
			},
			{
				field: 'enterprise_value_current',
				label: 'EV',
				format: 'money',
			},
			{
				field: 'enterprise_value_to_revenue_ttm',
				label: 'EV/Revenue',
				sub: 'TTM',
				format: 'number',
			},
			{
				field: 'enterprise_value_to_ebit_ttm',
				label: 'EV/EBIT',
				sub: 'TTM',
				format: 'number',
			},
			{
				field: 'enterprise_value_ebitda_ttm',
				label: 'EV/EBITDA',
				sub: 'TTM',
				format: 'number',
			},
		],
	},
	{
		id: 'dividends',
		label: 'Dividends',
		columns: [
			{
				field: 'dps_common_stock_prim_issue_fy',
				label: 'DPS',
				sub: 'FY',
				format: 'moneyPrecise',
			},
			{
				field: 'dps_common_stock_prim_issue_fq',
				label: 'DPS',
				sub: 'FQ',
				format: 'moneyPrecise',
			},
			{
				field: 'dividends_yield_current',
				label: 'Div yield %',
				sub: 'TTM',
				format: 'percent',
			},
			{
				field: 'dividends_yield',
				label: 'Div yield %',
				sub: 'FY',
				format: 'percent',
			},
			{
				field: 'dividend_payout_ratio_ttm',
				label: 'Payout ratio %',
				sub: 'TTM',
				format: 'percent',
			},
			{
				field: 'dps_common_stock_prim_issue_yoy_growth_fy',
				label: 'DPS growth',
				sub: 'FY YoY',
				format: 'change',
			},
			{
				field: 'continuous_dividend_payout',
				label: 'Continuous payout',
				sub: 'Years',
				format: 'integer',
			},
			{
				field: 'continuous_dividend_growth',
				label: 'Continuous growth',
				sub: 'Years',
				format: 'integer',
			},
		],
	},
	{
		id: 'profitability',
		label: 'Profitability',
		columns: [
			{
				field: 'gross_margin_ttm',
				label: 'Gross margin %',
				sub: 'TTM',
				format: 'change',
			},
			{
				field: 'operating_margin_ttm',
				label: 'Oper margin %',
				sub: 'TTM',
				format: 'change',
			},
			{
				field: 'pre_tax_margin_ttm',
				label: 'Pretax margin %',
				sub: 'TTM',
				format: 'change',
			},
			{
				field: 'net_margin_ttm',
				label: 'Net margin %',
				sub: 'TTM',
				format: 'change',
			},
			{
				field: 'free_cash_flow_margin_ttm',
				label: 'FCF margin %',
				sub: 'TTM',
				format: 'change',
			},
			{
				field: 'return_on_assets_fq',
				label: 'ROA %',
				sub: 'FQ',
				format: 'change',
			},
			{
				field: 'return_on_equity_fq',
				label: 'ROE %',
				sub: 'FQ',
				format: 'change',
			},
			{
				field: 'return_on_invested_capital_fq',
				label: 'ROIC %',
				sub: 'FQ',
				format: 'change',
			},
			{
				field: 'research_and_dev_ratio_ttm',
				label: 'R&D ratio %',
				sub: 'TTM',
				format: 'percent',
			},
			{
				field: 'sell_gen_admin_exp_other_ratio_ttm',
				label: 'SG&A ratio %',
				sub: 'TTM',
				format: 'percent',
			},
		],
	},
	{
		id: 'income',
		label: 'Income statement',
		columns: [
			fiscalPeriod,
			fiscalPeriodEnd,
			{
				field: 'total_revenue_ttm',
				label: 'Revenue',
				sub: 'TTM',
				format: 'money',
			},
			{
				field: 'total_revenue_yoy_growth_ttm',
				label: 'Revenue growth',
				sub: 'TTM YoY',
				format: 'change',
			},
			{
				field: 'gross_profit_ttm',
				label: 'Gross profit',
				sub: 'TTM',
				format: 'money',
			},
			{
				field: 'oper_income_ttm',
				label: 'Oper income',
				sub: 'TTM',
				format: 'money',
			},
			{
				field: 'net_income_ttm',
				label: 'Net income',
				sub: 'TTM',
				format: 'money',
			},
			{
				field: 'ebitda_ttm',
				label: 'EBITDA',
				sub: 'TTM',
				format: 'money',
			},
			epsDil,
			epsDilGrowth,
		],
	},
	{
		id: 'balance',
		label: 'Balance sheet',
		columns: [
			fiscalPeriod,
			fiscalPeriodEnd,
			{
				field: 'total_assets_fq',
				label: 'Assets',
				sub: 'FQ',
				format: 'money',
			},
			{
				field: 'total_current_assets_fq',
				label: 'Current assets',
				sub: 'FQ',
				format: 'money',
			},
			{
				field: 'cash_n_short_term_invest_fq',
				label: 'Cash & ST inv.',
				sub: 'FQ',
				format: 'money',
			},
			{
				field: 'total_liabilities_fq',
				label: 'Liabilities',
				sub: 'FQ',
				format: 'money',
			},
			{
				field: 'total_debt_fq',
				label: 'Debt',
				sub: 'FQ',
				format: 'money',
			},
			{
				field: 'net_debt_fq',
				label: 'Net debt',
				sub: 'FQ',
				format: 'money',
			},
			{
				field: 'total_equity_fq',
				label: 'Equity',
				sub: 'FQ',
				format: 'money',
			},
			{
				field: 'current_ratio_fq',
				label: 'Current ratio',
				sub: 'FQ',
				format: 'number',
			},
			{
				field: 'quick_ratio_fq',
				label: 'Quick ratio',
				sub: 'FQ',
				format: 'number',
			},
			{
				field: 'debt_to_equity_fq',
				label: 'Debt / Equity',
				sub: 'FQ',
				format: 'number',
			},
			{
				field: 'cash_n_short_term_invest_to_total_debt_fq',
				label: 'Cash / Debt',
				sub: 'FQ',
				format: 'number',
			},
		],
	},
	{
		id: 'cashflow',
		label: 'Cash flow',
		columns: [
			fiscalPeriod,
			fiscalPeriodEnd,
			{
				field: 'cash_f_operating_activities_ttm',
				label: 'Operating CF',
				sub: 'TTM',
				format: 'money',
			},
			{
				field: 'cash_f_investing_activities_ttm',
				label: 'Investing CF',
				sub: 'TTM',
				format: 'money',
			},
			{
				field: 'cash_f_financing_activities_ttm',
				label: 'Financing CF',
				sub: 'TTM',
				format: 'money',
			},
			{
				field: 'free_cash_flow_ttm',
				label: 'FCF',
				sub: 'TTM',
				format: 'money',
			},
			{
				field: 'neg_capital_expenditures_ttm',
				label: 'CAPEX',
				sub: 'TTM',
				format: 'money',
			},
		],
	},
	{
		id: 'pershare',
		label: 'Per share',
		columns: [
			{
				field: 'revenue_per_share_ttm',
				label: 'Revenue / share',
				sub: 'TTM',
				format: 'moneyPrecise',
			},
			{
				field: 'earnings_per_share_basic_ttm',
				label: 'EPS basic',
				sub: 'TTM',
				format: 'moneyPrecise',
			},
			epsDil,
			{
				field: 'operating_cash_flow_per_share_ttm',
				label: 'OCF / share',
				sub: 'TTM',
				format: 'moneyPrecise',
			},
			{
				field: 'free_cash_flow_per_share_ttm',
				label: 'FCF / share',
				sub: 'TTM',
				format: 'moneyPrecise',
			},
			{
				field: 'ebit_per_share_ttm',
				label: 'EBIT / share',
				sub: 'TTM',
				format: 'moneyPrecise',
			},
			{
				field: 'ebitda_per_share_ttm',
				label: 'EBITDA / share',
				sub: 'TTM',
				format: 'moneyPrecise',
			},
			{
				field: 'book_value_per_share_fq',
				label: 'BVPS',
				sub: 'FQ',
				format: 'moneyPrecise',
			},
			{
				field: 'total_debt_per_share_fq',
				label: 'Debt / share',
				sub: 'FQ',
				format: 'moneyPrecise',
			},
			{
				field: 'cash_per_share_fq',
				label: 'Cash / share',
				sub: 'FQ',
				format: 'moneyPrecise',
			},
		],
	},
];

/**
 * Intraday fields that only mean anything inside the session they came from.
 * When upstream is still serving an earlier session's bar these are dropped, so
 * last session's move never renders as though it were today's.
 */
export const SESSION_FIELDS = [
	'change',
	'volume',
	'relative_volume_10d_calc',
	'gap',
	'volume_change',
	'premarket_close',
	'premarket_change',
	'premarket_gap',
	'premarket_volume',
];

export const DEFAULT_TAB: ScreenerTabId = 'custom';

export const getTab = (id: ScreenerTabId) =>
	SCREENER_TABS.find((t) => t.id === id) ?? SCREENER_TABS[0];

/** TradingView fields a column needs from the scanner. */
export const columnFields = (c: ScreenerColumn) =>
	c.requires ?? (c.displayField ? [c.field, c.displayField] : [c.field]);

/**
 * Unique column list for a tab: base columns first, then data + display
 * columns, then fields for columns the user added.
 */
export const getRequestColumns = (
	id: ScreenerTabId,
	extraFields: string[] = []
) => {
	const cols = new Set(BASE_COLUMNS);
	for (const c of getTab(id).columns)
		for (const f of columnFields(c)) cols.add(f);
	for (const f of extraFields) cols.add(f);
	return [...cols];
};

// ---------------------------------------------------------------------------
// Filter chips — presets mirror TradingView's own screener dropdowns exactly,
// captured from the live `/indonesia/scan` requests (see the API reference).
// ---------------------------------------------------------------------------

export type ConditionOperation =
	| 'greater'
	| 'egreater'
	| 'less'
	| 'eless'
	| 'equal'
	| 'in_range'
	| 'crosses';

export type ConditionOption = {
	label: string;
	subtitle?: string;
	operation: ConditionOperation;
	right: number | number[] | string;
};

export type ConditionChipDef = {
	field: string;
	label: string;
	/** Hint for the manual-setup inputs; `abbr` accepts values like 10T / 500B. */
	unit: 'price' | 'percent' | 'abbr' | 'number';
	options: ConditionOption[];
};

/** Shared by "Chg %" and every "Perf %" period — TradingView reuses this exact ladder. */
export const CHANGE_LIKE_OPTIONS: ConditionOption[] = [
	{ label: 'Above 30%', subtitle: 'Exceptional up', operation: 'greater', right: 30 },
	{ label: 'Above 20%', subtitle: 'Very strong up', operation: 'greater', right: 20 },
	{ label: 'Above 10%', subtitle: 'Strong up', operation: 'greater', right: 10 },
	{ label: 'Above 5%', subtitle: 'Moderate up', operation: 'greater', right: 5 },
	{ label: '0% to 5%', subtitle: 'Weak up', operation: 'in_range', right: [0, 5] },
	{ label: 'Above 0%', subtitle: 'Up', operation: 'greater', right: 0 },
	{ label: 'Below 0%', subtitle: 'Down', operation: 'less', right: 0 },
	{ label: '−5% to 0%', subtitle: 'Weak down', operation: 'in_range', right: [-5, 0] },
	{ label: 'Below −5%', subtitle: 'Moderate down', operation: 'less', right: -5 },
	{ label: 'Below −10%', subtitle: 'Strong down', operation: 'less', right: -10 },
	{ label: 'Below −20%', subtitle: 'Severe down', operation: 'less', right: -20 },
	{ label: 'Below −30%', subtitle: 'Extreme down', operation: 'less', right: -30 },
];

export const CONDITION_CHIPS: ConditionChipDef[] = [
	{
		field: 'close',
		label: 'Price',
		unit: 'price',
		options: [
			{ label: 'Above 100', subtitle: 'Fractional shares time', operation: 'greater', right: 100 },
			{ label: '10 to 100', subtitle: 'Mid-priced', operation: 'in_range', right: [10, 100] },
			{ label: '10 and below', subtitle: 'Not quite penny stocks', operation: 'eless', right: 10 },
			{ label: '5 and below', subtitle: 'Penny stocks', operation: 'eless', right: 5 },
			{ label: 'Above EMA 50', subtitle: 'Uptrend', operation: 'greater', right: 'EMA50' },
			{ label: 'Below EMA 50', subtitle: 'Downtrend', operation: 'less', right: 'EMA50' },
			{ label: 'Crosses BB 20 Upper', subtitle: 'Overbought', operation: 'crosses', right: 'BB.upper' },
			{ label: 'Crosses BB 20 Lower', subtitle: 'Oversold', operation: 'crosses', right: 'BB.lower' },
		],
	},
	{ field: 'change', label: 'Chg %', unit: 'percent', options: CHANGE_LIKE_OPTIONS },
	{
		field: 'market_cap_basic',
		label: 'Mkt cap',
		unit: 'abbr',
		// Same thresholds as TradingView's Indonesia screener, which applies them
		// to the IDR value as-is (no USD conversion): Mega = 200 B IDR and above.
		options: [
			{ label: '200 B IDR and above', subtitle: 'Mega', operation: 'egreater', right: 200_000_000_000 },
			{ label: '10 B to 200 B IDR', subtitle: 'Large', operation: 'in_range', right: [10_000_000_000, 200_000_000_000] },
			{ label: '2 B to 10 B IDR', subtitle: 'Mid', operation: 'in_range', right: [2_000_000_000, 10_000_000_000] },
			{ label: '300 M to 2 B IDR', subtitle: 'Small', operation: 'in_range', right: [300_000_000, 2_000_000_000] },
			{ label: '50 M to 300 M IDR', subtitle: 'Micro', operation: 'in_range', right: [50_000_000, 300_000_000] },
			{ label: '50 M IDR and below', subtitle: 'Nano', operation: 'eless', right: 50_000_000 },
		],
	},
	{
		field: 'price_earnings_ttm',
		label: 'P/E',
		unit: 'number',
		options: [
			{ label: '50 and above', subtitle: 'Extremely high', operation: 'egreater', right: 50 },
			{ label: '35 to 50', subtitle: 'Very high', operation: 'in_range', right: [35, 50] },
			{ label: '25 to 35', subtitle: 'High', operation: 'in_range', right: [25, 35] },
			{ label: '15 to 25', subtitle: 'Moderate', operation: 'in_range', right: [15, 25] },
			{ label: '5 to 15', subtitle: 'Low', operation: 'in_range', right: [5, 15] },
			{ label: '0 to 5', subtitle: 'Very low', operation: 'in_range', right: [0, 5] },
		],
	},
	{
		field: 'earnings_per_share_diluted_yoy_growth_ttm',
		label: 'EPS dil growth',
		unit: 'percent',
		options: [
			{ label: 'Above 50%', subtitle: 'Exceptional growth', operation: 'greater', right: 50 },
			{ label: '25% to 50%', subtitle: 'Strong growth', operation: 'in_range', right: [25, 50] },
			{ label: '10% to 25%', subtitle: 'Moderate growth', operation: 'in_range', right: [10, 25] },
			{ label: '5% to 10%', subtitle: 'Low growth', operation: 'in_range', right: [5, 10] },
			{ label: '0% to 5%', subtitle: 'Minimal growth', operation: 'in_range', right: [0, 5] },
			{ label: 'Above 0%', subtitle: 'Growth', operation: 'greater', right: 0 },
			{ label: 'Below 0%', subtitle: 'Reduction', operation: 'less', right: 0 },
		],
	},
	{
		field: 'dividends_yield_current',
		label: 'Div yield %',
		unit: 'percent',
		options: [
			{ label: 'Above 15%', subtitle: 'Exceptional', operation: 'greater', right: 15 },
			{ label: '10% to 15%', subtitle: 'Very high', operation: 'in_range', right: [10, 15] },
			{ label: '6% to 10%', subtitle: 'High', operation: 'in_range', right: [6, 10] },
			{ label: '4% to 6%', subtitle: 'Moderate', operation: 'in_range', right: [4, 6] },
			{ label: '2% to 4%', subtitle: 'Low', operation: 'in_range', right: [2, 4] },
			{ label: '0% to 2%', subtitle: 'Very low', operation: 'in_range', right: [0, 2] },
			{ label: '0%', subtitle: 'No dividend', operation: 'equal', right: 0 },
		],
	},
	{
		field: 'total_revenue_yoy_growth_ttm',
		label: 'Revenue growth',
		unit: 'percent',
		options: [
			{ label: 'Above 50%', subtitle: 'Exceptional growth', operation: 'greater', right: 50 },
			{ label: '25% to 50%', subtitle: 'Strong growth', operation: 'in_range', right: [25, 50] },
			{ label: '10% to 25%', subtitle: 'Moderate growth', operation: 'in_range', right: [10, 25] },
			{ label: '5% to 10%', subtitle: 'Low growth', operation: 'in_range', right: [5, 10] },
			{ label: '0% to 5%', subtitle: 'Minimal growth', operation: 'in_range', right: [0, 5] },
			{ label: 'Above 0%', subtitle: 'Growth', operation: 'greater', right: 0 },
			{ label: 'Below 0%', subtitle: 'Reduction', operation: 'less', right: 0 },
			{ label: '−25% to 0%', subtitle: 'Moderate reduction', operation: 'in_range', right: [-25, 0] },
			{ label: '−50% to −25%', subtitle: 'Strong reduction', operation: 'in_range', right: [-50, -25] },
			{ label: 'Below −50%', subtitle: 'Severe reduction', operation: 'less', right: -50 },
		],
	},
	{
		field: 'price_earnings_growth_ttm',
		label: 'PEG',
		unit: 'number',
		options: [
			{ label: 'Above 3', subtitle: 'Extremely high', operation: 'greater', right: 3 },
			{ label: '2 to 3', subtitle: 'Very high', operation: 'in_range', right: [2, 3] },
			{ label: '1.5 to 2', subtitle: 'High', operation: 'in_range', right: [1.5, 2] },
			{ label: '1 to 1.5', subtitle: 'Moderate', operation: 'in_range', right: [1, 1.5] },
			{ label: '0.5 to 1', subtitle: 'Low', operation: 'in_range', right: [0.5, 1] },
			{ label: '0 to 0.5', subtitle: 'Very low', operation: 'in_range', right: [0, 0.5] },
			{ label: 'Below 0', subtitle: 'Negative', operation: 'less', right: 0 },
		],
	},
	{
		field: 'return_on_equity_fq',
		label: 'ROE',
		unit: 'percent',
		options: [
			{ label: 'Above 30%', subtitle: 'Very high', operation: 'greater', right: 30 },
			{ label: '20% to 30%', subtitle: 'High', operation: 'in_range', right: [20, 30] },
			{ label: '10% to 20%', subtitle: 'Moderate', operation: 'in_range', right: [10, 20] },
			{ label: '5% to 10%', subtitle: 'Low', operation: 'in_range', right: [5, 10] },
			{ label: '0% to 5%', subtitle: 'Very low', operation: 'in_range', right: [0, 5] },
			{ label: 'Above 0%', subtitle: 'Positive', operation: 'greater', right: 0 },
			{ label: '0% and below', subtitle: 'Zero and negative', operation: 'eless', right: 0 },
			{ label: '−15% to 0%', subtitle: 'Moderate loss', operation: 'in_range', right: [-15, 0] },
			{ label: '−30% to −15%', subtitle: 'Substantial loss', operation: 'in_range', right: [-30, -15] },
			{ label: 'Below −30%', subtitle: 'Severe loss', operation: 'less', right: -30 },
		],
	},
	{
		field: 'beta_5_year',
		label: 'Beta',
		unit: 'number',
		options: [
			{ label: 'Above 1.5', subtitle: 'Very high volatility', operation: 'greater', right: 1.5 },
			{ label: '1.1 to 1.5', subtitle: 'High volatility', operation: 'in_range', right: [1.1, 1.5] },
			{ label: '0.9 to 1.1', subtitle: 'Near market volatility', operation: 'in_range', right: [0.9, 1.1] },
			{ label: '0.5 to 0.9', subtitle: 'Low volatility', operation: 'in_range', right: [0.5, 0.9] },
			{ label: '0 to 0.5', subtitle: 'Very low volatility', operation: 'in_range', right: [0, 0.5] },
			{ label: 'Above 0', subtitle: 'Positive sensitivity', operation: 'greater', right: 0 },
			{ label: 'Below 0', subtitle: 'Inverse sensitivity', operation: 'less', right: 0 },
		],
	},
];

/** The "Perf %" chip's date-range sub-dropdown just swaps which field the value ladder applies to. */
export const PERF_PERIODS: { label: string; field: string }[] = [
	{ label: '1 week', field: 'Perf.W' },
	{ label: '1 month', field: 'Perf.1M' },
	{ label: '3 months', field: 'Perf.3M' },
	{ label: '6 months', field: 'Perf.6M' },
	{ label: 'Year to date', field: 'Perf.YTD' },
	{ label: '1 year', field: 'Perf.Y' },
	{ label: '5 years', field: 'Perf.5Y' },
	{ label: '10 years', field: 'Perf.10Y' },
	{ label: 'All time', field: 'Perf.All' },
];

export const PERF_DEFAULT_FIELD = 'Perf.YTD';

export type DateRangeOption = {
	label: string;
	operation: 'in_day_range' | 'in_week_range' | 'in_month_range';
	right: [number, number];
};

export const RECENT_EARNINGS_FIELD = 'earnings_release_trading_date_fq';
export const UPCOMING_EARNINGS_FIELD = 'earnings_release_next_trading_date_fq';

export const RECENT_EARNINGS_OPTIONS: DateRangeOption[] = [
	{ label: 'Current trading day', operation: 'in_day_range', right: [0, 0] },
	{ label: 'Previous day', operation: 'in_day_range', right: [-1, -1] },
	{ label: 'Previous 5 days', operation: 'in_day_range', right: [-5, -1] },
	{ label: 'This week', operation: 'in_week_range', right: [0, 0] },
	{ label: 'Previous week', operation: 'in_week_range', right: [-1, -1] },
	{ label: 'This month', operation: 'in_month_range', right: [0, 0] },
];

export const UPCOMING_EARNINGS_OPTIONS: DateRangeOption[] = [
	{ label: 'Current trading day', operation: 'in_day_range', right: [0, 0] },
	{ label: 'Next day', operation: 'in_day_range', right: [1, 1] },
	{ label: 'Next 5 days', operation: 'in_day_range', right: [1, 5] },
	{ label: 'This week', operation: 'in_week_range', right: [0, 0] },
	{ label: 'Next week', operation: 'in_week_range', right: [1, 1] },
	{ label: 'This month', operation: 'in_month_range', right: [0, 0] },
];

/** Value sent is Title Case; label is the sentence-case text TradingView displays. */
export const SECTORS = [
	{ value: 'Commercial Services', label: 'Commercial services' },
	{ value: 'Communications', label: 'Communications' },
	{ value: 'Consumer Durables', label: 'Consumer durables' },
	{ value: 'Consumer Non-Durables', label: 'Consumer non-durables' },
	{ value: 'Consumer Services', label: 'Consumer services' },
	{ value: 'Distribution Services', label: 'Distribution services' },
	{ value: 'Electronic Technology', label: 'Electronic technology' },
	{ value: 'Energy Minerals', label: 'Energy minerals' },
	{ value: 'Finance', label: 'Finance' },
	{ value: 'Health Services', label: 'Health services' },
	{ value: 'Health Technology', label: 'Health technology' },
	{ value: 'Industrial Services', label: 'Industrial services' },
	{ value: 'Miscellaneous', label: 'Miscellaneous' },
	{ value: 'Non-Energy Minerals', label: 'Non-energy minerals' },
	{ value: 'Process Industries', label: 'Process industries' },
	{ value: 'Producer Manufacturing', label: 'Producer manufacturing' },
	{ value: 'Retail Trade', label: 'Retail trade' },
	{ value: 'Technology Services', label: 'Technology services' },
	{ value: 'Transportation', label: 'Transportation' },
	{ value: 'Utilities', label: 'Utilities' },
];

export const ANALYST_RATINGS = [
	{ value: 'StrongSell', label: 'Strong sell' },
	{ value: 'Sell', label: 'Sell' },
	{ value: 'Neutral', label: 'Neutral' },
	{ value: 'Buy', label: 'Buy' },
	{ value: 'StrongBuy', label: 'Strong buy' },
	{ value: 'NoRating', label: 'No rating' },
];

/** Dropdown order + labels exactly as TradingView's Index chip shows them. */
export const INDEXES = [
	{ value: 'IDX:IDX30', label: 'IDX30 · IDX 30' },
	{ value: 'IDX:LQ45', label: 'LQ45 · IDX LQ45' },
	{ value: 'IDX:ISSI', label: 'ISSI · Indonesia Sharia Stock Index' },
	{ value: 'IDX:JII70', label: 'JII70 · Jakarta Islamic 70 Index' },
	{ value: 'IDX:JII', label: 'JII · Jakarta Islamic Index' },
	{ value: 'IDX:KOMPAS100', label: 'KOMPAS100 · IDX Kompas 100' },
	{ value: 'IDX:IDXMESBUMN', label: 'IDXMESBUMN · IDX-MES BUMN 17' },
	{ value: 'IDX:IDXSHAGROW', label: 'IDXSHAGROW · IDX Sharia Growth' },
	{ value: 'IDX:IDX80', label: 'IDX80 · IDX 80' },
	{ value: 'IDX:IDXBUMN20', label: 'IDXBUMN20 · IDX BUMN20' },
	{ value: 'IDX:IDXHIDIV20', label: 'IDXHIDIV20 · IDX High Dividend 20' },
	{ value: 'IDX:IDXSMC_COM', label: 'IDXSMC_COM · IDX SMC Composite' },
	{ value: 'IDX:INFOBANK15', label: 'INFOBANK15 · Infobank 15' },
	{ value: 'IDX:SRI_KEHATI', label: 'SRI_KEHATI · SRI-KEHATI' },
	{ value: 'IDX:ESGQKEHATI', label: 'ESGQKEHATI · ESG Quality 45 IDX KEHATI' },
	{ value: 'IDX:IDXESGL', label: 'IDXESGL · IDX ESG Leaders' },
	{ value: 'IDX:IDXG30', label: 'IDXG30 · IDX Growth 30' },
	{ value: 'IDX:PRIMBANK10', label: 'PRIMBANK10 · IDX PEFINDO Prime Bank' },
	{ value: 'IDX:BISNIS_27', label: 'BISNIS_27 · JSX BISNIS 27' },
	{ value: 'IDX:ESGSKEHATI', label: 'ESGSKEHATI · ESG Sector Leaders IDX KEHATI' },
	{ value: 'IDX:IDXLQ45LCL', label: 'IDXLQ45LCL · IDX LQ45 Low Carbon Leaders' },
	{ value: 'IDX:IDXV30', label: 'IDXV30 · IDX Value 30' },
	{ value: 'IDX:I_GRADE', label: 'I_GRADE · PEFINDO i-Grade' },
	{ value: 'IDX:ECONOMIC30', label: 'ECONOMIC30 · IDX Cyclical Economy 30' },
	{ value: 'IDX:IDXQ30', label: 'IDXQ30 · IDX Quality 30' },
	{ value: 'IDX:IDXSMC_LIQ', label: 'IDXSMC_LIQ · IDX SMC Liquid' },
	{ value: 'IDX:INVESTOR33', label: 'INVESTOR33 · Investor 33' },
	{ value: 'IDX:MNC36', label: 'MNC36 · MNC36' },
	{ value: 'IDX:SMINFRA18', label: 'SMINFRA18 · SMinfra 18' },
	{ value: 'IDX:IDXVESTA28', label: 'IDXVESTA28 · IDX Infovesta Multi Factor 28' },
	{ value: 'STOXX:EDE15BP', label: 'EDE15BP · STOXX Emerging Markets 1500' },
	{ value: 'STOXX:SXABCP', label: 'SXABCP · STOXX Asia 100' },
	{ value: 'STOXX:SXEA18P', label: 'SXEA18P · STOXX East Asia 1800' },
	{ value: 'STOXX:SXEAXJP', label: 'SXEAXJP · STOXX East Asia 1800 ex Japan' },
	{ value: 'STOXX:EDE5P', label: 'EDE5P · STOXX Emerging Markets 50' },
];
