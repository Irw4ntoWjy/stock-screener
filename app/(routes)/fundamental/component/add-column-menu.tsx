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
import { cn } from '@/lib/utils';
import { Check, ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { categoryIcon } from '../category-icons';
import {
	CATALOG,
	CATALOG_FIELDS,
	catalogColumns,
	rawFieldColumn,
} from '../column-catalog';
import { ScreenerColumn } from '../screener-config';
import {
	getTradingViewFields,
	TradingViewField,
} from '../server/fetch-tradingview-fields';
import { TvCategory, TvColumn } from '../tradingview-columns';

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

const columnMatches = (q: string, c: TvColumn) =>
	matches(q, c.label, c.id) ||
	c.variants.some((v) => matches(q, v.sub, v.field));

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
	const [categoryId, setCategoryId] = useState<string>();
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
	const category = CATALOG.find((c) => c.id === categoryId);

	const openCategory = (id?: string) => {
		setCategoryId(id);
		setQuery('');
	};

	/** Sections to list: one category's, or every category's while searching. */
	const sections = useMemo(() => {
		const from = (c: TvCategory) =>
			c.sections.map((s) => ({
				key: `${c.id}:${s.label ?? ''}`,
				heading: category ? s.label : s.label ? `${c.label} · ${s.label}` : c.label,
				columns: s.columns.filter((col) => columnMatches(q, col)),
			}));
		if (category) return from(category).filter((s) => s.columns.length);
		if (!q) return [];
		return CATALOG.flatMap(from).filter((s) => s.columns.length);
	}, [category, q]);

	const rawMatches = useMemo(() => {
		if (category || q.length < 2 || !rawFields) return [];
		const out: ScreenerColumn[] = [];
		for (const f of rawFields) {
			if (CATALOG_FIELDS.has(f.name)) continue;
			const col = rawFieldColumn(f.name, f.type);
			if (matches(q, col.label, f.name)) out.push(col);
			if (out.length >= RAW_RESULT_LIMIT) break;
		}
		return out;
	}, [category, q, rawFields]);

	const variantState = (v: ScreenerColumn) => ({
		inTab: tabFields.has(v.field),
		added: addedFields.has(v.field),
	});

	const subTag = (sub?: string) =>
		sub && (
			<span className="ml-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
				{sub}
			</span>
		);

	const singleItem = (c: ScreenerColumn, key = c.field) => {
		const { inTab, added } = variantState(c);
		return (
			<CommandItem
				key={key}
				value={key}
				disabled={inTab}
				onSelect={() => onToggle(c)}
				className="text-foreground data-[selected=true]:bg-muted data-[selected=true]:text-foreground"
			>
				<span className="flex-1">
					{c.label}
					{subTag(c.sub)}
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

	/** Several periods / lengths: each one is a chip that toggles on its own. */
	const variantItem = (c: TvColumn) => {
		const first = c.variants.find((v) => !tabFields.has(v.field));
		const anyAdded = c.variants.some((v) => addedFields.has(v.field));
		return (
			<CommandItem
				key={c.id}
				value={c.id}
				disabled={!first}
				// Enter on the row toggles its first free variant
				onSelect={() => first && onToggle(first)}
				className="flex-col items-stretch gap-1.5 text-foreground data-[selected=true]:bg-muted data-[selected=true]:text-foreground"
			>
				<span className="flex items-center">
					<span className="flex-1">{c.label}</span>
					{anyAdded && <Check className="size-3.5 text-primary" />}
				</span>
				<span className="flex flex-wrap gap-1">
					{c.variants.map((v) => {
						const { inTab, added } = variantState(v);
						return (
							<button
								key={v.field}
								type="button"
								disabled={inTab}
								title={inTab ? 'Already in this tab' : v.field}
								onClick={(e) => {
									e.stopPropagation();
									onToggle(v);
								}}
								className={cn(
									'rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide cursor-pointer transition-colors',
									added
										? 'border-primary bg-primary text-primary-foreground'
										: 'border-border text-muted-foreground hover:border-foreground hover:text-foreground',
									inTab &&
										'cursor-default border-dashed opacity-50 hover:border-border hover:text-muted-foreground'
								)}
							>
								{v.sub ?? 'Default'}
							</button>
						);
					})}
				</span>
			</CommandItem>
		);
	};

	const columnItem = (c: TvColumn) =>
		c.variants.length === 1
			? singleItem(c.variants[0], c.id)
			: variantItem(c);

	return (
		<Popover
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (!next) openCategory(undefined);
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
				className="flex w-96 flex-col overflow-hidden p-2 bg-card text-foreground border-border"
				align="end"
			>
				{category ? (
					<button
						type="button"
						onClick={() => openCategory(undefined)}
						className="mb-1 flex w-full items-center gap-1.5 rounded-sm px-1 py-1.5 text-sm font-semibold hover:bg-muted cursor-pointer"
					>
						<ChevronLeft className="size-4" />
						{category.label}
					</button>
				) : (
					<p className="mb-1 px-1 py-1.5 text-sm font-semibold">
						Columns
					</p>
				)}
				{/* filtering is done here: cmdk would score all 1,000+ raw fields */}
				<Command
					shouldFilter={false}
					className="min-h-0 flex-1 bg-card text-foreground"
				>
					<CommandInput
						value={query}
						onValueChange={setQuery}
						placeholder={
							category
								? `Search ${category.label.toLowerCase()}...`
								: 'Search columns...'
						}
						className="h-9"
					/>
					<CommandList className="max-h-96 min-h-0 flex-1">
						{(category || q) && (
							<CommandEmpty>No match.</CommandEmpty>
						)}
						{!category && !q && (
							<CommandGroup>
								{CATALOG.map((c) => {
									const Icon = categoryIcon(c.id);
									const columns = catalogColumns(c);
									const added = columns.filter((col) =>
										col.variants.some((v) =>
											addedFields.has(v.field)
										)
									).length;
									return (
										<CommandItem
											key={c.id}
											value={c.id}
											onSelect={() => openCategory(c.id)}
											className="py-2 text-foreground data-[selected=true]:bg-muted data-[selected=true]:text-foreground"
										>
											<Icon className="size-4 text-foreground" />
											<span className="flex-1">{c.label}</span>
											{added > 0 && (
												<span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
													{added}
												</span>
											)}
											<span className="w-6 text-right text-xs text-muted-foreground">
												{columns.length}
											</span>
											<ChevronRight className="size-3.5 text-muted-foreground" />
										</CommandItem>
									);
								})}
							</CommandGroup>
						)}
						{sections.map((s) => (
							<CommandGroup key={s.key} heading={s.heading}>
								{s.columns.map(columnItem)}
							</CommandGroup>
						))}
						{!category && q.length >= 2 && (
							<CommandGroup heading="All TradingView fields">
								{rawMatches.map((c) => singleItem(c))}
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
				<p className="shrink-0 border-t px-2 pt-2 mt-1 text-[11px] text-muted-foreground">
					{category
						? 'Pick a period or length chip to add that variant.'
						: 'Search here to look through every category and every TradingView field.'}
				</p>
			</PopoverContent>
		</Popover>
	);
}
