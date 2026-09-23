'use client';

import { Button } from '@/components/ui/button';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { Check, Loader2, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
	CURATED_FIELDS,
	CURATED_GROUPS,
	rawFieldColumn,
} from '../column-catalog';
import { ScreenerColumn } from '../screener-config';
import {
	getTradingViewFields,
	TradingViewField,
} from '../server/fetch-tradingview-fields';

// 1,000+ raw fields: only the best matches render, and only once searched.
const RAW_RESULT_LIMIT = 50;

let fieldsPromise: Promise<TradingViewField[]> | undefined;
const loadFields = () => {
	if (!fieldsPromise)
		fieldsPromise = getTradingViewFields().catch((e) => {
			fieldsPromise = undefined; // let the next open retry
			throw e;
		});
	return fieldsPromise;
};

const matches = (q: string, ...texts: (string | undefined)[]) =>
	!q || texts.some((t) => t?.toLowerCase().includes(q));

export function AddColumnMenu({
	tabFields,
	addedFields,
	onToggle,
}: {
	/** Fields the tab shows on its own; they cannot be added twice. */
	tabFields: Set<string>;
	addedFields: Set<string>;
	onToggle: (column: ScreenerColumn) => void;
}) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [rawFields, setRawFields] =
		useState<TradingViewField[]>();
	const [loadError, setLoadError] = useState(false);

	useEffect(() => {
		if (!open || rawFields || loadError) return;
		loadFields()
			.then(setRawFields)
			.catch(() => setLoadError(true));
	}, [open, rawFields, loadError]);

	const q = query.trim().toLowerCase();

	const groups = useMemo(
		() =>
			CURATED_GROUPS.map((g) => ({
				...g,
				columns: g.columns.filter((c) =>
					matches(q, c.label, c.sub, c.field)
				),
			})).filter((g) => g.columns.length),
		[q]
	);

	const rawMatches = useMemo(() => {
		if (q.length < 2 || !rawFields) return [];
		const out: ScreenerColumn[] = [];
		for (const f of rawFields) {
			if (CURATED_FIELDS.has(f.name)) continue;
			const col = rawFieldColumn(f.name, f.type);
			if (matches(q, col.label, f.name)) out.push(col);
			if (out.length >= RAW_RESULT_LIMIT) break;
		}
		return out;
	}, [q, rawFields]);

	const item = (c: ScreenerColumn) => {
		const inTab = tabFields.has(c.field);
		const added = addedFields.has(c.field);
		return (
			<CommandItem
				key={c.field}
				value={c.field}
				disabled={inTab}
				onSelect={() => onToggle(c)}
				className="text-foreground data-[selected=true]:bg-muted data-[selected=true]:text-foreground"
			>
				<span className="flex-1">
					{c.label}
					{c.sub && (
						<span className="ml-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
							{c.sub}
						</span>
					)}
				</span>
				{inTab ? (
					<span className="text-xs text-muted-foreground">
						In tab
					</span>
				) : (
					added && <Check className="size-3.5 text-primary" />
				)}
			</CommandItem>
		);
	};

	return (
		<Popover
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (!next) setQuery('');
			}}
		>
			<PopoverTrigger asChild>
				<Button
					size="sm"
					variant="ghost"
					title="Add column"
					className="size-7 p-0 text-muted-foreground hover:bg-background hover:text-foreground"
				>
					<Plus className="size-4" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-80 p-2 bg-card text-foreground border-border"
				align="end"
			>
				{/* filtering is done here: cmdk would score all 1,000+ raw fields */}
				<Command
					shouldFilter={false}
					className="bg-card text-foreground"
				>
					<CommandInput
						value={query}
						onValueChange={setQuery}
						placeholder="Search columns..."
						className="h-9"
					/>
					<CommandList className="max-h-96">
						<CommandEmpty>No match.</CommandEmpty>
						{groups.map((g) => (
							<CommandGroup key={g.label} heading={g.label}>
								{g.columns.map(item)}
							</CommandGroup>
						))}
						{q.length >= 2 && (
							<CommandGroup heading="All TradingView fields">
								{rawMatches.map(item)}
								{!rawFields && (
									<div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
										{loadError ? (
											'Could not load the TradingView field list.'
										) : (
											<>
												<Loader2 className="size-3.5 animate-spin" />
												Loading fields...
											</>
										)}
									</div>
								)}
							</CommandGroup>
						)}
					</CommandList>
				</Command>
				<p className="border-t px-2 pt-2 mt-1 text-[11px] text-muted-foreground">
					Type 2+ letters to search every TradingView field.
				</p>
			</PopoverContent>
		</Popover>
	);
}
