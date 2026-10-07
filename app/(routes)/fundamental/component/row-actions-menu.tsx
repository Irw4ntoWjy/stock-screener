'use client';

import { Button } from '@/components/ui/button';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { Building, ChartLine, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const itemClass =
	'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-foreground hover:bg-muted focus-visible:bg-muted focus-visible:outline-none';

/** One "⋯" menu per row instead of a button per action. */
export function RowActionsMenu({ ticker }: { ticker: string }) {
	const [open, setOpen] = useState(false);
	const close = () => setOpen(false);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					size="sm"
					variant="ghost"
					title={`Actions for ${ticker}`}
					aria-label={`Actions for ${ticker}`}
					className="size-7 p-0 text-muted-foreground hover:bg-muted hover:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground"
				>
					<MoreHorizontal className="size-4" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className="w-44 p-1 bg-card text-foreground border-border"
			>
				<Link
					href={`/company-profile/${ticker}?from=fundamental`}
					onClick={close}
					className={itemClass}
				>
					<Building className="size-4 text-muted-foreground" />
					Company profile
				</Link>
				<Link href={`/chart/${ticker}`} onClick={close} className={itemClass}>
					<ChartLine className="size-4 text-muted-foreground" />
					Chart
				</Link>
			</PopoverContent>
		</Popover>
	);
}
