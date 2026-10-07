import {
	Activity,
	BadgePercent,
	Calculator,
	ChartCandlestick,
	ChartColumn,
	ChartPie,
	HandCoins,
	Info,
	LucideIcon,
	TrendingUp,
} from 'lucide-react';

/** TradingView's column / filter categories, shared by both "+" menus. */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
	securityInfo: Info,
	marketData: ChartCandlestick,
	technicals: Activity,
	financials: ChartColumn,
	valuation: ChartPie,
	growth: TrendingUp,
	marginsAndRatios: BadgePercent,
	dividends: HandCoins,
	custom: Calculator,
};

export const categoryIcon = (id: string): LucideIcon =>
	CATEGORY_ICONS[id] ?? Info;
