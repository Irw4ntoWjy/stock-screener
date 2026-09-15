'use client';

import { cn } from '@/lib/utils';
import {
	ColumnDef,
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	OnChangeFn,
	PaginationState,
	SortingState,
	useReactTable,
} from '@tanstack/react-table';
import { ScreenerRow } from '../fundamental-page-schema';

declare module '@tanstack/react-table' {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	interface ColumnMeta<TData, TValue> {
		sticky?: boolean;
		alignRight?: boolean;
	}
}

interface ScreenerTableProps {
	columns: ColumnDef<ScreenerRow>[];
	data: ScreenerRow[];
	sorting: SortingState;
	onSortingChange: OnChangeFn<SortingState>;
	pagination: PaginationState;
	onPaginationChange: OnChangeFn<PaginationState>;
}

export function useScreenerTable({
	columns,
	data,
	sorting,
	onSortingChange,
	pagination,
	onPaginationChange,
}: ScreenerTableProps) {
	return useReactTable({
		data,
		columns,
		state: { sorting, pagination },
		onSortingChange,
		onPaginationChange,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getRowId: (row) => row.symbol,
		autoResetPageIndex: false,
	});
}

export function ScreenerTable({
	table,
}: {
	table: ReturnType<typeof useScreenerTable>;
}) {
	const rows = table.getRowModel().rows;
	const colCount = table.getVisibleLeafColumns().length;

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
										'h-11 px-3 whitespace-nowrap align-middle border-b bg-muted',
										meta?.alignRight ? 'text-right' : 'text-left',
										meta?.sticky && 'sticky left-0 z-30'
									)}
								>
									{header.isPlaceholder
										? null
										: flexRender(
												header.column.columnDef.header,
												header.getContext()
										  )}
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
												'sticky left-0 z-10 bg-card group-hover:bg-muted'
										)}
									>
										{flexRender(
											cell.column.columnDef.cell,
											cell.getContext()
										)}
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
