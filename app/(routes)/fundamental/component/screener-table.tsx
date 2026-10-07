'use client';

import { cn } from '@/lib/utils';
import {
	ColumnDef,
	ColumnSizingState,
	Header,
	RowData,
	TableMeta,
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	OnChangeFn,
	PaginationState,
	SortingState,
	useReactTable,
} from '@tanstack/react-table';
import { ReactNode, PointerEvent as ReactPointerEvent, useEffect, useState } from 'react';
import { ScreenerRow } from '../fundamental-page-schema';
import { ScreenerColumn } from '../screener-config';

declare module '@tanstack/react-table' {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	interface ColumnMeta<TData, TValue> {
		sticky?: boolean;
		/** Pinned to the right edge (the action / "+" column). */
		stickyRight?: boolean;
		alignRight?: boolean;
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	interface TableMeta<TData extends RowData> {
		/** Props for the "+" column picker in the action header. */
		addColumn?: {
			tabFields: Set<string>;
			addedFields: Set<string>;
			onToggle: (column: ScreenerColumn) => void;
		};
	}
}

interface ScreenerTableProps {
	columns: ColumnDef<ScreenerRow>[];
	data: ScreenerRow[];
	sorting: SortingState;
	onSortingChange: OnChangeFn<SortingState>;
	pagination: PaginationState;
	onPaginationChange: OnChangeFn<PaginationState>;
	meta?: TableMeta<ScreenerRow>;
}

// Per-viewer convenience: column widths the user dragged, keyed by column id.
// A blocked or wiped store just means every column sizes to its content.
const WIDTHS_KEY = 'fundamental.column-widths.v1';
const MIN_WIDTH = 48;
const CELL_PADDING = 24; // px-3 on both sides

const readWidths = (): ColumnSizingState => {
	try {
		const parsed = JSON.parse(localStorage.getItem(WIDTHS_KEY) ?? '{}');
		return parsed && typeof parsed === 'object' ? parsed : {};
	} catch {
		return {};
	}
};

export function useScreenerTable({
	columns,
	data,
	sorting,
	onSortingChange,
	pagination,
	onPaginationChange,
	meta,
}: ScreenerTableProps) {
	const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
	const [restored, setRestored] = useState(false);

	// restored after mount: localStorage is not there during SSR
	useEffect(() => {
		setColumnSizing(readWidths());
		setRestored(true);
	}, []);

	useEffect(() => {
		if (!restored) return;
		try {
			localStorage.setItem(WIDTHS_KEY, JSON.stringify(columnSizing));
		} catch {
			// storage unavailable: the widths still apply for this visit
		}
	}, [columnSizing, restored]);

	return useReactTable({
		data,
		columns,
		state: { sorting, pagination, columnSizing },
		meta,
		onSortingChange,
		onPaginationChange,
		onColumnSizingChange: setColumnSizing,
		enableColumnResizing: true,
		columnResizeMode: 'onChange',
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getRowId: (row) => row.symbol,
		autoResetPageIndex: false,
	});
}

/**
 * Drag handle on a header's right edge, like a spreadsheet. The drag starts
 * from the column's rendered width (not a default), so it never jumps;
 * double-click hands the column back to automatic sizing.
 */
function ResizeHandle({ header }: { header: Header<ScreenerRow, unknown> }) {
	const { column } = header;
	const table = header.getContext().table;
	if (!column.getCanResize()) return null;

	const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		const th = e.currentTarget.parentElement;
		if (!th) return;
		const startX = e.clientX;
		const startWidth = th.getBoundingClientRect().width;
		const move = (ev: PointerEvent) =>
			table.setColumnSizing((s) => ({
				...s,
				[column.id]: Math.max(
					MIN_WIDTH,
					Math.round(startWidth + ev.clientX - startX)
				),
			}));
		const up = () => {
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
			document.body.style.removeProperty('cursor');
			document.body.style.removeProperty('user-select');
		};
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
		document.body.style.cursor = 'col-resize';
		document.body.style.userSelect = 'none';
	};

	const reset = () =>
		table.setColumnSizing((s) => {
			const next = { ...s };
			delete next[column.id];
			return next;
		});

	return (
		<div
			role="separator"
			aria-orientation="vertical"
			aria-label={`Resize ${column.id}`}
			title="Drag to resize · double-click to fit"
			onPointerDown={onPointerDown}
			onDoubleClick={(e) => {
				e.stopPropagation();
				reset();
			}}
			onClick={(e) => e.stopPropagation()}
			// a wider hit area than the line itself, centred on the column edge
			className="group/resize absolute top-0 -right-1.5 z-10 flex h-full w-3 cursor-col-resize touch-none select-none justify-center"
		>
			{/* always-visible divider, so the edges to drag are easy to find */}
			<span className="my-auto h-3/5 w-0.5 rounded-full bg-muted-foreground/40 transition-all group-hover/resize:h-full group-hover/resize:w-1 group-hover/resize:bg-primary group-active/resize:bg-primary" />
		</div>
	);
}

/** A dragged column gets a fixed width; what does not fit is cut off with "…". */
const Sized = ({
	width,
	alignRight,
	children,
}: {
	width?: number;
	alignRight?: boolean;
	children: ReactNode;
}) =>
	width === undefined ? (
		<>{children}</>
	) : (
		// table cells ignore max-width under auto layout, so the box inside does it
		<div
			className={cn('overflow-hidden text-ellipsis', alignRight && 'ml-auto')}
			style={{ width: Math.max(width - CELL_PADDING, 0) }}
		>
			{children}
		</div>
	);

export function ScreenerTable({
	table,
}: {
	table: ReturnType<typeof useScreenerTable>;
}) {
	const rows = table.getRowModel().rows;
	const colCount = table.getVisibleLeafColumns().length;
	const widths = table.getState().columnSizing;

	return (
		<table className="w-full caption-bottom text-sm border-separate border-spacing-0">
			<thead className="sticky top-0 z-20">
				{table.getHeaderGroups().map((group) => (
					<tr key={group.id}>
						{group.headers.map((header) => {
							const meta = header.column.columnDef.meta;
							return (
								<th
									key={header.id}
									className={cn(
										'relative h-11 px-3 whitespace-nowrap align-middle border-b bg-muted',
										meta?.alignRight
											? 'text-right'
											: 'text-left',
										meta?.sticky && 'sticky left-0 z-30',
										meta?.stickyRight &&
											// pinned from md up; on phones it would eat half the width
											'md:sticky md:right-0 z-30 md:border-l md:shadow-[-6px_0_8px_-6px_rgb(0_0_0/0.15)]'
									)}
								>
									<Sized
										width={widths[header.column.id]}
										alignRight={meta?.alignRight}
									>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext()
												)}
									</Sized>
									<ResizeHandle header={header} />
								</th>
							);
						})}
					</tr>
				))}
			</thead>
			<tbody>
				{rows.length ? (
					rows.map((row) => (
						<tr
							key={row.id}
							className={cn(
								'group transition-colors hover:bg-muted/50',
								row.original.active_symbol === false &&
									'bg-red-500/5'
							)}
						>
							{row.getVisibleCells().map((cell) => {
								const meta = cell.column.columnDef.meta;
								return (
									<td
										key={cell.id}
										className={cn(
											'h-10 px-3 whitespace-nowrap align-middle border-b tabular-nums',
											meta?.alignRight && 'text-right',
											meta?.sticky &&
												'sticky left-0 z-10 bg-card group-hover:bg-muted',
											meta?.stickyRight &&
												'md:sticky md:right-0 z-10 bg-card group-hover:bg-muted md:border-l md:shadow-[-6px_0_8px_-6px_rgb(0_0_0/0.15)]'
										)}
									>
										<Sized
											width={widths[cell.column.id]}
											alignRight={meta?.alignRight}
										>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext()
											)}
										</Sized>
									</td>
								);
							})}
						</tr>
					))
				) : (
					<tr>
						<td
							colSpan={colCount}
							className="h-24 text-center text-muted-foreground"
						>
							No stocks match these filters.
						</td>
					</tr>
				)}
			</tbody>
		</table>
	);
}
