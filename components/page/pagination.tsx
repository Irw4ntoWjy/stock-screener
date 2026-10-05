import { cn } from '@/lib/utils';
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from '../ui/pagination';

interface PaginationProps {
	currentPage: number;
	totalItems: number;
	itemsPerPage: number;
	onPageChange: (page: number) => void;
	fetchTime?: string;
}

export function DataTablePagination({
	currentPage,
	totalItems,
	itemsPerPage,
	onPageChange,
	fetchTime,
}: PaginationProps) {
	const totalPages = Math.ceil(totalItems / itemsPerPage);

	if (totalPages <= 1) return null;

	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = Math.min(
		startIndex + itemsPerPage,
		totalItems
	);

	const getPageNumbers = () => {
		if (totalPages <= 5)
			return Array.from({ length: totalPages }, (_, i) => i + 1);
		if (currentPage <= 3) return [1, 2, 3, 4, 5];
		if (currentPage >= totalPages - 2)
			return Array.from(
				{ length: 5 },
				(_, i) => totalPages - 4 + i
			);
		return Array.from(
			{ length: 5 },
			(_, i) => currentPage - 2 + i
		);
	};

	return (
		<div className="mt-3 flex flex-col items-center gap-2 sm:mt-4 sm:flex-row sm:justify-between">
			<div className="order-2 text-xs text-muted-foreground sm:order-none sm:text-sm">
				Showing {startIndex + 1} to {endIndex} of {totalItems}{' '}
				Stocks
			</div>

			<Pagination className="mx-0 w-auto">
				<PaginationContent className="flex items-center gap-0.5 sm:gap-1">
					<PaginationItem>
						<PaginationPrevious
							onClick={() =>
								onPageChange(Math.max(1, currentPage - 1))
							}
							className={cn(
								currentPage === 1
									? 'pointer-events-none opacity-50 text-muted-foreground'
									: 'cursor-pointer hover:bg-accent'
							)}
						/>
					</PaginationItem>

					{getPageNumbers().map((pageNum) => (
						<PaginationItem key={pageNum}>
							<PaginationLink
								onClick={() => onPageChange(pageNum)}
								isActive={currentPage === pageNum}
								className="cursor-pointer"
							>
								{pageNum}
							</PaginationLink>
						</PaginationItem>
					))}

					{totalPages > 5 && currentPage < totalPages - 2 && (
						<PaginationItem>
							<PaginationEllipsis />
						</PaginationItem>
					)}

					<PaginationItem>
						<PaginationNext
							onClick={() =>
								onPageChange(
									Math.min(totalPages, currentPage + 1)
								)
							}
							className={cn(
								currentPage === totalPages
									? 'pointer-events-none opacity-50 text-muted-foreground'
									: 'cursor-pointer hover:bg-accent'
							)}
						/>
					</PaginationItem>
				</PaginationContent>
			</Pagination>

			{fetchTime && (
				<div className="order-3 text-xs text-muted-foreground whitespace-nowrap sm:order-none sm:text-sm">
					Last fetched at: {fetchTime}
				</div>
			)}
		</div>
	);
}
