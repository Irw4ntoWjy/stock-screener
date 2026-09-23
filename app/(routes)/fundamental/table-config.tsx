'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
	Column,
	ColumnDef,
	HeaderContext,
} from '@tanstack/react-table';
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
	X,
} from 'lucide-react';
import Link from 'next/link';
import { AddColumnMenu } from './component/add-column-menu';
import { SymbolCell } from './component/symbol-cell';
import {
	abbreviate,
	formatInteger,
	formatNumber,
	formatPercent,
	formatPrice,
	formatUnixDate,
	idxIndexCodes,
	isNum,
	LOT_SIZE,
	ratingLabel,
	ratingRank,
} from './format';
import {
	ScreenerRow,
	ScreenerTabId,
} from './fundamental-page-schema';
import { ScreenerColumn, getTab } from './screener-config';

const TEXT_FORMATS = new Set([
	'text',
	'rating',
	'patterns',
	'indexes',
]);

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

function RatingCell({
	raw,
	text,
}: {
	raw: unknown;
	text: unknown;
}) {
	const label =
		(typeof text === 'string' && text) || ratingLabel(raw);
	if (!label) return <Empty />;

	const key = typeof raw === 'string' ? raw : label;
	const map: Record<
		string,
		{ Icon: typeof Minus; cls: string }
	> = {
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
		<span
			className={cn('inline-flex items-center gap-1.5', cls)}
		>
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
					text={
						col.displayField ? row[col.displayField] : undefined
					}
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
		case 'indexes': {
			const codes = idxIndexCodes(v);
			return codes.length ? (
				<span
					className="block max-w-[260px] truncate"
					title={codes.join(', ')}
				>
					{codes.join(', ')}
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
		case 'lot':
			return formatInteger(v / LOT_SIZE);
		case 'fundamental':
			return (
				<>
					{Math.abs(v) >= 1e6 ? abbreviate(v) : formatNumber(v)}
					<Currency code={row.fundamental_currency_code} />
				</>
			);
		case 'auto':
			return Math.abs(v) >= 1e6
				? abbreviate(v)
				: formatNumber(v);
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
			{sorted === 'asc' && (
				<ArrowUp className="size-3 shrink-0" />
			)}
			{sorted === 'desc' && (
				<ArrowDown className="size-3 shrink-0" />
			)}
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
	if (col.format === 'indexes')
		return idxIndexCodes(v).length || undefined;
	if (TEXT_FORMATS.has(col.format))
		return typeof v === 'string' && v ? v : undefined;
	return isNum(v) ? v : undefined;
};

const valueColumn = (
	col: ScreenerColumn,
	onRemove?: (col: ScreenerColumn) => void
): ColumnDef<ScreenerRow> => ({
	id: col.field,
	accessorFn: (row) => sortValue(col, row),
	sortUndefined: 'last',
	sortDescFirst: isNumericColumn(col),
	sortingFn: col.format === 'text' ? 'text' : 'basic',
	header: ({ column }) => {
		const sort = (
			<SortHeader
				column={column}
				label={col.label}
				sub={col.sub}
				alignRight={isNumericColumn(col)}
			/>
		);
		if (!onRemove) return sort;
		return (
			<div
				className={cn(
					'group/col flex items-center gap-1',
					isNumericColumn(col) && 'flex-row-reverse'
				)}
			>
				{sort}
				<button
					type="button"
					title="Remove column"
					onClick={() => onRemove(col)}
					className="shrink-0 rounded-sm p-0.5 text-muted-foreground opacity-0 hover:bg-background hover:text-foreground group-hover/col:opacity-100 focus-visible:opacity-100 cursor-pointer"
				>
					<X className="size-3" />
				</button>
			</div>
		);
	},
	cell: ({ row }) => <ValueCell col={col} row={row.original} />,
	meta: { alignRight: isNumericColumn(col) },
});

/**
 * flexRender mounts a header function as a component, so a closure rebuilt with
 * the columns would remount the menu and close it on every pick. This one keeps
 * its identity and reads what changes from the table's meta.
 */
function AddColumnHeader({
	table,
}: HeaderContext<ScreenerRow, unknown>) {
	const menu = table.options.meta?.addColumn;
	return menu ? (
		<div className="flex justify-end">
			<AddColumnMenu {...menu} />
		</div>
	) : null;
}

export const getFundamentalColumns = (
	tabId: ScreenerTabId,
	totalCount: number,
	added: ScreenerColumn[],
	onRemoveAdded: (col: ScreenerColumn) => void
): ColumnDef<ScreenerRow>[] => {
	const tabColumns = getTab(tabId).columns;

	return [
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
		...tabColumns.map((col) => valueColumn(col)),
		...added.map((col) => valueColumn(col, onRemoveAdded)),
		{
			id: 'action',
			enableSorting: false,
			header: AddColumnHeader,
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
			meta: { stickyRight: true },
		},
	];
};
