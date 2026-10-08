'use client';

import { cn } from '@/lib/utils';
import {
	ColumnDef,
	ColumnOrderState,
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
	/** Column order is remembered per key (the screener tab). */
	orderKey: string;
}

// Per-viewer convenience: column widths the user dragged, keyed by column id.
// A blocked or wiped store just means every column sizes to its content.
const WIDTHS_KEY = 'fundamental.column-widths.v1';
const MIN_WIDTH = 48;
const CELL_PADDING = 24; // px-3 on both sides

// Same for the column order the user dragged, per tab.
const ORDER_KEY = 'fundamental.column-order.v1';
/** Pinned to the right edge; left out of saved orders so new columns land before it. */
const ACTION_COLUMN = 'action';

const readStored = <T extends object>(key: string): T => {
	try {
		const parsed = JSON.parse(localStorage.getItem(key) ?? '{}');
		return parsed && typeof parsed === 'object' ? parsed : ({} as T);
	} catch {
		return {} as T;
	}
};

const writeStored = (key: string, value: unknown) => {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// storage unavailable: the layout still applies for this visit
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
	orderKey,
}: ScreenerTableProps) {
	const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
	const [orders, setOrders] = useState<Record<string, ColumnOrderState>>({});
	const [restored, setRestored] = useState(false);

	// restored after mount: localStorage is not there during SSR
	useEffect(() => {
		setColumnSizing(readStored<ColumnSizingState>(WIDTHS_KEY));
		setOrders(readStored<Record<string, ColumnOrderState>>(ORDER_KEY));
		setRestored(true);
	}, []);

	useEffect(() => {
		if (restored) writeStored(WIDTHS_KEY, columnSizing);
	}, [columnSizing, restored]);

	useEffect(() => {
		if (restored) writeStored(ORDER_KEY, orders);
	}, [orders, restored]);

	const columnOrder = orders[orderKey] ?? [];
	const onColumnOrderChange: OnChangeFn<ColumnOrderState> = (updater) =>
		setOrders((all) => {
			const next =
				typeof updater === 'function' ? updater(all[orderKey] ?? []) : updater;
			return { ...all, [orderKey]: next.filter((id) => id !== ACTION_COLUMN) };
		});

	return useReactTable({
		data,
		columns,
		state: { sorting, pagination, columnSizing, columnOrder },
		meta,
		onSortingChange,
		onPaginationChange,
		onColumnSizingChange: setColumnSizing,
		onColumnOrderChange,
		enableColumnResizing: true,
		columnResizeMode: 'onChange',
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getRowId: (row) => row.symbol,
		autoResetPageIndex: false,
	});
}

/** Set while a resize edge is held, so the header under it does not start a column drag. */
let resizing = false;

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
		resizing = true;
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
			resizing = false;
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
			draggable={false}
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

	// Column drag and drop: the pinned Symbol and action columns stay put.
	const [dragId, setDragId] = useState<string>();
	const [drop, setDrop] = useState<{ id: string; after: boolean }>();
	const movable = (meta?: { sticky?: boolean; stickyRight?: boolean }) =>
		!meta?.sticky && !meta?.stickyRight;

	const moveColumn = (from: string, to: string, after: boolean) => {
		if (from === to) return;
		const ids = table.getVisibleLeafColumns().map((c) => c.id);
		const rest = ids.filter((id) => id !== from);
		const at = rest.indexOf(to);
		if (at < 0) return;
		rest.splice(after ? at + 1 : at, 0, from);
		table.setColumnOrder(rest);
	};

	const endDrag = () => {
		setDragId(undefined);
		setDrop(undefined);
	};

	return (
		<table className="w-full caption-bottom text-sm border-separate border-spacing-0">
			<thead className="sticky top-0 z-20">
				{table.getHeaderGroups().map((group) => (
					<tr key={group.id}>
						{group.headers.map((header) => {
							const meta = header.column.columnDef.meta;
							const id = header.column.id;
							const canMove = movable(meta);
							const dropHere = drop?.id === id && dragId !== id;
							return (
								<th
									key={header.id}
									draggable={canMove}
									title={canMove ? 'Drag to move this column' : undefined}
									onDragStart={(e) => {
										if (!canMove || resizing) {
											e.preventDefault();
											return;
										}
										setDragId(id);
										e.dataTransfer.effectAllowed = 'move';
										e.dataTransfer.setData('text/plain', id);
									}}
									onDragOver={(e) => {
										if (!dragId || !canMove) return;
										e.preventDefault();
										e.dataTransfer.dropEffect = 'move';
										const box = e.currentTarget.getBoundingClientRect();
										const after = e.clientX > box.left + box.width / 2;
										if (drop?.id !== id || drop.after !== after)
											setDrop({ id, after });
									}}
									onDragLeave={(e) => {
										// leaving for a child element is not leaving the header
										if (!e.currentTarget.contains(e.relatedTarget as Node))
											setDrop((d) => (d?.id === id ? undefined : d));
									}}
									onDrop={(e) => {
										e.preventDefault();
										if (dragId && drop) moveColumn(dragId, id, drop.after);
										endDrag();
									}}
									onDragEnd={endDrag}
									className={cn(
										'relative h-11 px-3 whitespace-nowrap align-middle border-b bg-muted',
										canMove && 'cursor-grab active:cursor-grabbing',
										dragId === id && 'opacity-40',
										// where the dragged column will land
										dropHere &&
											(drop.after
												? 'shadow-[inset_-3px_0_0_0_var(--primary)]'
												: 'shadow-[inset_3px_0_0_0_var(--primary)]'),
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
