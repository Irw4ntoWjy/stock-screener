'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Column, ColumnDef } from '@tanstack/react-table';
import {
	ArrowDown,
	ArrowUp,
	Building,
	ChartLine,
	ChevronDown,
	ChevronsDown,
	ChevronsUp,
	ChevronUp,
	Minus,
} from 'lucide-react';
import Link from 'next/link';
import { SymbolCell } from './component/symbol-cell';
import {
	abbreviate,
	formatInteger,
	formatNumber,
	formatPercent,
	formatPrice,
	formatUnixDate,
	isNum,
	ratingLabel,
	ratingRank,
} from './format';
import { ScreenerRow, ScreenerTabId } from './fundamental-page-schema';
import { ScreenerColumn, getTab } from './screener-config';

const TEXT_FORMATS = new Set(['text', 'rating', 'patterns']);

export const isNumericColumn = (c: ScreenerColumn) =>
	!TEXT_FORMATS.has(c.format);

const Empty = () => (
	<span className="text-muted-foreground">—</span>
);

const Currency = ({ code }: { code: unknown }) =>
	typeof code === 'string' ? (
		<span className="ml-0.5 text-[10px] text-muted-foreground">
			{code}
		</span>
	) : null;

function RatingCell({ raw, text }: { raw: unknown; text: unknown }) {
	const label =
		(typeof text === 'string' && text) || ratingLabel(raw);
	if (!label) return <Empty />;

	const key = typeof raw === 'string' ? raw : label;
	const map: Record<string, { Icon: typeof Minus; cls: string }> = {
		StrongBuy: { Icon: ChevronsUp, cls: 'text-blue-500' },
		Buy: { Icon: ChevronUp, cls: 'text-blue-500' },
		Neutral: { Icon: Minus, cls: 'text-muted-foreground' },
		Sell: { Icon: ChevronDown, cls: 'text-red-500' },
		StrongSell: { Icon: ChevronsDown, cls: 'text-red-500' },
	};
	const { Icon, cls } = map[key] ?? {
		Icon: Minus,
		cls: 'text-muted-foreground',
	};

	return (
		<span className={cn('inline-flex items-center gap-1.5', cls)}>
			<Icon className="size-3.5" />
			{label}
		</span>
	);
}

/** Renders one cell value according to its column format. */
export function ValueCell({
	col,
	row,
}: {
	col: ScreenerColumn;
	row: ScreenerRow;
}) {
	const v = row[col.field];

	switch (col.format) {
		case 'text': {
			const text = row[col.displayField ?? col.field] ?? v;
			return typeof text === 'string' && text ? (
				<span className="whitespace-nowrap">{text}</span>
			) : (
				<Empty />
			);
		}
		case 'rating':
			return (
				<RatingCell
					raw={v}
					text={col.displayField ? row[col.displayField] : undefined}
				/>
			);
		case 'patterns': {
			const list = Array.isArray(v)
				? v.filter(Boolean).map(String)
				: typeof v === 'string' && v
				? [v]
				: [];
			return list.length ? (
				<span
					className="block max-w-[220px] truncate"
					title={list.join(', ')}
				>
					{list.join(', ')}
				</span>
			) : (
				<Empty />
			);
		}
		case 'date':
			return formatUnixDate(v) ?? <Empty />;
	}

	if (!isNum(v)) return <Empty />;

	switch (col.format) {
		case 'price':
			return (
				<>
					{formatPrice(v, row)}
					<Currency code={row.currency} />
				</>
			);
		case 'money':
			return (
				<>
					{abbreviate(v)}
					<Currency code={row.fundamental_currency_code} />
				</>
			);
		case 'moneyPrecise':
			return (
				<>
					{formatNumber(v)}
					<Currency code={row.fundamental_currency_code} />
				</>
			);
		case 'change':
			return (
				<span
					className={cn(
						v > 0 && 'text-green-600 dark:text-green-500',
						v < 0 && 'text-red-600 dark:text-red-500'
					)}
				>
					{formatPercent(v, true)}
				</span>
			);
		case 'percent':
			return formatPercent(v);
		case 'volume':
			return abbreviate(v);
		case 'integer':
			return formatInteger(v);
		default:
			return formatNumber(v);
	}
}

function SortHeader({
	column,
	label,
	sub,
	alignRight,
}: {
	column: Column<ScreenerRow, unknown>;
	label: string;
	sub?: string;
	alignRight?: boolean;
}) {
	const sorted = column.getIsSorted();
	return (
		<button
			type="button"
			onClick={column.getToggleSortingHandler()}
			className={cn(
				'group flex w-full items-center gap-1 text-xs font-normal text-muted-foreground hover:text-foreground cursor-pointer',
				alignRight && 'justify-end'
			)}
		>
			{sorted === 'asc' && <ArrowUp className="size-3 shrink-0" />}
			{sorted === 'desc' && <ArrowDown className="size-3 shrink-0" />}
			<span
				className={cn(
					'flex flex-col leading-tight',
					alignRight ? 'items-end' : 'items-start'
				)}
			>
				<span className={cn(sorted && 'text-foreground')}>
					{label}
				</span>
				{sub && (
					<span className="text-[9px] uppercase tracking-wide">
						{sub}
					</span>
				)}
			</span>
		</button>
	);
}

const sortValue = (col: ScreenerColumn, row: ScreenerRow) => {
	const v = row[col.field];
	if (col.format === 'rating')
		return isNum(v) ? v : ratingRank(v);
	if (col.format === 'patterns')
		return Array.isArray(v) ? v.length || undefined : undefined;
	if (TEXT_FORMATS.has(col.format))
		return typeof v === 'string' && v ? v : undefined;
	return isNum(v) ? v : undefined;
};

export const getFundamentalColumns = (
	tabId: ScreenerTabId,
	totalCount: number
): ColumnDef<ScreenerRow>[] => [
	{
		id: 'symbol',
		accessorFn: (row) => row.ticker,
		sortingFn: 'alphanumeric',
		header: ({ column }) => (
			<SortHeader
				column={column}
				label="Symbol"
				sub={totalCount.toLocaleString('en-US')}
			/>
		),
		cell: ({ row }) => <SymbolCell row={row.original} />,
		meta: { sticky: true },
	},
	...getTab(tabId).columns.map(
		(col): ColumnDef<ScreenerRow> => ({
			id: col.field,
			accessorFn: (row) => sortValue(col, row),
			sortUndefined: 'last',
			sortDescFirst: isNumericColumn(col),
			sortingFn: col.format === 'text' ? 'text' : 'basic',
			header: ({ column }) => (
				<SortHeader
					column={column}
					label={col.label}
					sub={col.sub}
					alignRight={isNumericColumn(col)}
				/>
			),
			cell: ({ row }) => (
				<ValueCell col={col} row={row.original} />
			),
			meta: { alignRight: isNumericColumn(col) },
		})
	),
	{
		id: 'action',
		enableSorting: false,
		header: () => null,
		cell: ({ row }) => (
			<div className="flex justify-end gap-1">
				<Button
					asChild
					size="sm"
					variant="ghost"
					title="Company profile"
					className="size-7 p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
				>
					<Link
						href={`/company-profile/${row.original.ticker}?from=fundamental`}
					>
						<Building className="size-4" />
					</Link>
				</Button>
				<Button
					asChild
					size="sm"
					variant="ghost"
					title="Chart"
					className="size-7 p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
				>
					<Link href={`/chart/${row.original.ticker}`}>
						<ChartLine className="size-4" />
					</Link>
				</Button>
			</div>
		),
	},
];
