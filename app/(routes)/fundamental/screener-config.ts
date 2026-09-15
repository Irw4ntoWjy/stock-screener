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
	| 'patterns';

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
};

export type ScreenerTab = {
	id: ScreenerTabId;
	label: string;
	columns: ScreenerColumn[];
};

/** Always requested: symbol cell, formatting and row-state columns. */
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

export const DEFAULT_TAB: ScreenerTabId = 'overview';

export const getTab = (id: ScreenerTabId) =>
	SCREENER_TABS.find((t) => t.id === id) ?? SCREENER_TABS[0];

/** Unique column list for a tab: base columns first, then data + display columns. */
export const getRequestColumns = (id: ScreenerTabId) => {
	const cols = new Set(BASE_COLUMNS);
	for (const c of getTab(id).columns) {
		cols.add(c.field);
		if (c.displayField) cols.add(c.displayField);
	}
	return [...cols];
};

// ---------------------------------------------------------------------------
// Filter chips
// ---------------------------------------------------------------------------

export type RangeChip = {
	field: string;
	label: string;
	/** Hint for the inputs; `abbr` accepts values like 10T / 500B. */
	unit: 'price' | 'percent' | 'abbr' | 'number';
};

export const RANGE_CHIPS: RangeChip[] = [
	{ field: 'close', label: 'Price', unit: 'price' },
	{ field: 'change', label: 'Chg %', unit: 'percent' },
	{ field: 'market_cap_basic', label: 'Mkt cap', unit: 'abbr' },
	{ field: 'price_earnings_ttm', label: 'P/E', unit: 'number' },
	{
		field: 'earnings_per_share_diluted_yoy_growth_ttm',
		label: 'EPS dil growth',
		unit: 'percent',
	},
	{ field: 'dividends_yield_current', label: 'Div yield %', unit: 'percent' },
	{ field: 'Perf.Y', label: 'Perf % 1Y', unit: 'percent' },
	{
		field: 'total_revenue_yoy_growth_ttm',
		label: 'Revenue growth',
		unit: 'percent',
	},
	{ field: 'price_earnings_growth_ttm', label: 'PEG', unit: 'number' },
	{ field: 'return_on_equity_fq', label: 'ROE', unit: 'percent' },
	{ field: 'beta_1_year', label: 'Beta', unit: 'number' },
	{ field: 'volume', label: 'Vol', unit: 'abbr' },
];

export const SECTORS = [
	'Commercial Services',
	'Communications',
	'Consumer Durables',
	'Consumer Non-Durables',
	'Consumer Services',
	'Distribution Services',
	'Electronic Technology',
	'Energy Minerals',
	'Finance',
	'Health Services',
	'Health Technology',
	'Industrial Services',
	'Miscellaneous',
	'Non-Energy Minerals',
	'Process Industries',
	'Producer Manufacturing',
	'Retail Trade',
	'Technology Services',
	'Transportation',
	'Utilities',
];

export const ANALYST_RATINGS = [
	{ value: 'StrongBuy', label: 'Strong buy' },
	{ value: 'Buy', label: 'Buy' },
	{ value: 'Neutral', label: 'Neutral' },
	{ value: 'Sell', label: 'Sell' },
	{ value: 'StrongSell', label: 'Strong sell' },
	{ value: 'NoRating', label: 'No rating' },
];

export const INDEXES = [
	'IDX:LQ45',
	'IDX:IDX30',
	'IDX:IDX80',
	'IDX:KOMPAS100',
	'IDX:ISSI',
	'IDX:JII',
	'IDX:JII70',
	'IDX:IDXBUMN20',
	'IDX:IDXESGL',
	'IDX:ESGSKEHATI',
	'IDX:ESGQKEHATI',
	'IDX:SRI_KEHATI',
	'IDX:IDXG30',
	'IDX:IDXQ30',
	'IDX:IDXV30',
	'IDX:IDXHIDIV20',
	'IDX:IDXSMC_COM',
	'IDX:IDXSMC_LIQ',
	'IDX:IDXSHAGROW',
	'IDX:IDXMESBUMN',
	'IDX:IDXVESTA28',
	'IDX:IDXLQ45LCL',
	'IDX:INFOBANK15',
	'IDX:INVESTOR33',
	'IDX:BISNIS_27',
	'IDX:MNC36',
	'IDX:ECONOMIC30',
	'IDX:PRIMBANK10',
	'IDX:SMINFRA18',
	'IDX:I_GRADE',
].map((v) => ({ value: v, label: v.replace('IDX:', '') }));

export const EARNINGS_DAY_OPTIONS = [
	{ value: 0, label: 'Today' },
	{ value: 7, label: '7 days' },
	{ value: 30, label: '30 days' },
	{ value: 90, label: '90 days' },
];
