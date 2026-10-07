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
import { Input } from '@/components/ui/input';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
	Check,
	ChevronLeft,
	ChevronRight,
	Loader2,
	Plus,
	SlidersHorizontal,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
	AddFilterCatalog,
	CATALOG_URL,
	CatalogCategory,
	CatalogFilter,
	CatalogValue,
	defaultChoice,
	MANUAL_OPERATION_LABELS,
	multiSelectOperand,
	ParamChoice,
	paramSummary,
	resolveField,
	resolvePreset,
} from '../add-filter-catalog';
import { categoryIcon } from '../category-icons';
import { AddedFilter } from '../fundamental-page-schema';

let catalogPromise: Promise<AddFilterCatalog> | undefined;
const loadCatalog = () => {
	if (!catalogPromise)
		catalogPromise = fetch(CATALOG_URL)
			.then((r) => {
				if (!r.ok) throw new Error('Failed to load filter catalog');
				return r.json() as Promise<AddFilterCatalog>;
			})
			.catch((e) => {
				catalogPromise = undefined; // let the next open retry
				throw e;
			});
	return catalogPromise;
};

const matches = (q: string, ...texts: (string | undefined)[]) =>
	!q || texts.some((t) => t?.toLowerCase().includes(q));

const withPrefix = (prefix: string, text: string) =>
	prefix ? `${prefix} · ${text}` : text;

/** "SYML:IDX;LQ45" (scanner symbolset) -> "IDX:LQ45" (the Index chip's value). */
const indexChipValue = (v: CatalogValue) =>
	String(v.value).replace(/^SYML:([^;]+);/, '$1:');

const itemClass =
	'text-foreground data-[selected=true]:bg-muted data-[selected=true]:text-foreground';

// ---------------------------------------------------------------------------
// Filter bodies
// ---------------------------------------------------------------------------

function ParamSelects({
	entry,
	chosen,
	onChange,
}: {
	entry: CatalogFilter;
	chosen: ParamChoice;
	onChange: (next: ParamChoice) => void;
}) {
	if (!entry.params?.length) return null;
	return (
		<div className="flex flex-wrap gap-1.5 px-1 pb-2">
			{entry.params.map((p) => (
				<label key={p.name} className="flex min-w-0 flex-1 basis-28 flex-col gap-0.5">
					<span className="text-[10px] uppercase tracking-wide text-muted-foreground">
						{p.title}
					</span>
					<select
						value={chosen[p.name] ?? p.default}
						onChange={(e) => onChange({ ...chosen, [p.name]: e.target.value })}
						className="h-8 w-full rounded-sm border border-border bg-card px-1.5 text-xs text-foreground dark:bg-muted"
					>
						{p.options.map((o) => (
							<option key={o.value} value={o.value}>
								{o.label}
							</option>
						))}
					</select>
				</label>
			))}
		</div>
	);
}

function ConditionBody({
	entry,
	chosen,
	onAdd,
}: {
	entry: CatalogFilter;
	chosen: ParamChoice;
	onAdd: (added: AddedFilter) => void;
}) {
	const manualOps = (entry.operations ?? []).filter(
		(o) => o in MANUAL_OPERATION_LABELS
	);
	const [manual, setManual] = useState(!entry.presets?.length);
	const [operator, setOperator] = useState(manualOps[0] ?? 'greater');
	const [val1, setVal1] = useState('');
	const [val2, setVal2] = useState('');

	const prefix = paramSummary(entry, chosen);
	const isRange = operator === 'in_range' || operator === 'not_in_range';
	const parse = (s: string) =>
		s.trim() === '' || Number.isNaN(Number(s)) ? undefined : Number(s);
	const canApply =
		parse(val1) !== undefined && (!isRange || parse(val2) !== undefined);

	const applyManual = () => {
		if (!canApply) return;
		const a = parse(val1)!;
		const right = isRange
			? [Math.min(a, parse(val2)!), Math.max(a, parse(val2)!)]
			: a;
		const text = Array.isArray(right)
			? `${MANUAL_OPERATION_LABELS[operator]} ${right[0]} – ${right[1]}`
			: `${MANUAL_OPERATION_LABELS[operator]} ${right}`;
		onAdd({
			key: entry.key,
			label: entry.label,
			summary: withPrefix(prefix, text),
			operand: {
				expression: {
					left: resolveField(entry, chosen),
					operation: operator,
					right,
				},
			},
		});
	};

	if (!manual)
		return (
			<CommandList className="max-h-80 min-h-0 flex-1">
				<CommandGroup>
					{entry.presets?.map((p, i) => (
						<CommandItem
							key={i}
							value={`${i}`}
							onSelect={() =>
								onAdd({
									key: entry.key,
									label: entry.label,
									summary: withPrefix(prefix, p.title),
									operand: resolvePreset(entry, p, chosen),
								})
							}
							className={cn('flex-col items-start gap-0', itemClass)}
						>
							<span>{p.title}</span>
							{p.description && (
								<span className="text-xs text-muted-foreground">
									{p.description}
								</span>
							)}
						</CommandItem>
					))}
				</CommandGroup>
				{manualOps.length > 0 && (
					<CommandGroup className="border-t">
						<CommandItem
							value="manual"
							onSelect={() => setManual(true)}
							className={itemClass}
						>
							<SlidersHorizontal className="size-3.5" />
							Manual setup
						</CommandItem>
					</CommandGroup>
				)}
			</CommandList>
		);

	return (
		<form
			className="space-y-3 p-1"
			onSubmit={(e) => {
				e.preventDefault();
				applyManual();
			}}
		>
			{!!entry.presets?.length && (
				<button
					type="button"
					onClick={() => setManual(false)}
					className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
				>
					‹ Back to presets
				</button>
			)}
			<div className="grid grid-cols-3 gap-1">
				{manualOps.map((op) => (
					<button
						key={op}
						type="button"
						onClick={() => setOperator(op)}
						className={cn(
							'rounded-sm border px-2 py-1 text-xs cursor-pointer',
							operator === op
								? 'border-primary bg-primary/10 text-primary'
								: 'border-border text-muted-foreground hover:text-foreground'
						)}
					>
						{MANUAL_OPERATION_LABELS[op]}
					</button>
				))}
			</div>
			<div className="flex items-center gap-2">
				<Input
					autoFocus
					value={val1}
					onChange={(e) => setVal1(e.target.value)}
					placeholder={isRange ? 'From' : 'Value'}
					inputMode="decimal"
					className="h-8 dark:bg-muted"
				/>
				{isRange && (
					<>
						<span className="text-muted-foreground">–</span>
						<Input
							value={val2}
							onChange={(e) => setVal2(e.target.value)}
							placeholder="To"
							inputMode="decimal"
							className="h-8 dark:bg-muted"
						/>
					</>
				)}
			</div>
			<div className="flex justify-end">
				<Button type="submit" size="sm" disabled={!canApply}>
					Add filter
				</Button>
			</div>
		</form>
	);
}

function MultiSelectBody({
	entry,
	chosen,
	onAdd,
	onAddIndexes,
}: {
	entry: CatalogFilter;
	chosen: ParamChoice;
	onAdd: (added: AddedFilter) => void;
	onAddIndexes: (indexes: string[]) => void;
}) {
	const [picked, setPicked] = useState<string[]>([]);
	const values = useMemo(
		() =>
			[...(entry.values ?? [])].sort((a, b) =>
				entry.key === 'Index' ? 0 : a.label.localeCompare(b.label)
			),
		[entry]
	);
	const pickedValues = values.filter((v) => picked.includes(String(v.value)));

	const toggle = (v: string) =>
		setPicked((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));

	const add = () => {
		if (!pickedValues.length) return;
		if (entry.target === 'indexes') {
			onAddIndexes(pickedValues.map(indexChipValue));
			return;
		}
		const operand = multiSelectOperand(entry, pickedValues, chosen);
		if (!operand) return;
		onAdd({
			key: entry.key,
			label: entry.label,
			summary: withPrefix(
				paramSummary(entry, chosen),
				pickedValues.length === 1
					? pickedValues[0].label
					: `${pickedValues.length} selected`
			),
			operand,
		});
	};

	return (
		<>
			{values.length > 8 && (
				<CommandInput
					placeholder={`Search ${entry.label.toLowerCase()}...`}
					className="h-9"
				/>
			)}
			<CommandList className="max-h-64 min-h-0 flex-1">
				<CommandEmpty>No match.</CommandEmpty>
				<CommandGroup>
					{values.map((v) => {
						const key = String(v.value);
						const on = picked.includes(key);
						return (
							<CommandItem
								key={key}
								value={`${v.label} ${key}`}
								onSelect={() => toggle(key)}
								className={itemClass}
							>
								<span
									className={cn(
										'flex size-4 shrink-0 items-center justify-center rounded-sm border',
										on
											? 'bg-primary border-primary text-primary-foreground'
											: 'border-muted-foreground'
									)}
								>
									{on && <Check className="size-3" />}
								</span>
								{v.label}
							</CommandItem>
						);
					})}
				</CommandGroup>
			</CommandList>
			<div className="mt-1 flex shrink-0 justify-end border-t pt-2">
				<Button size="sm" disabled={!pickedValues.length} onClick={add}>
					Add filter{pickedValues.length ? ` (${pickedValues.length})` : ''}
				</Button>
			</div>
		</>
	);
}

function OptionListBody({
	entry,
	onAdd,
}: {
	entry: CatalogFilter;
	onAdd: (added: AddedFilter) => void;
}) {
	return (
		<CommandList className="max-h-80 min-h-0 flex-1">
			<CommandGroup>
				{entry.options?.map((o, i) => (
					<CommandItem
						key={i}
						value={`${i}`}
						onSelect={() =>
							onAdd({
								key: entry.key,
								label: entry.label,
								summary: o.label,
								operand: o.operand,
							})
						}
						className={itemClass}
					>
						{o.label}
					</CommandItem>
				))}
			</CommandGroup>
		</CommandList>
	);
}

function FilterPanel({
	entry,
	onAdd,
	onAddIndexes,
}: {
	entry: CatalogFilter;
	onAdd: (added: AddedFilter) => void;
	onAddIndexes: (indexes: string[]) => void;
}) {
	const [chosen, setChosen] = useState<ParamChoice>(() => defaultChoice(entry));
	return (
		<Command className="min-h-0 flex-1 bg-card text-foreground">
			{entry.thinOnIdx && (
				<p className="px-1 pb-2 text-xs text-amber-600 dark:text-amber-500">
					Limited data on IDX ({entry.idxCoveragePct ?? 0}% of stocks)
				</p>
			)}
			<ParamSelects entry={entry} chosen={chosen} onChange={setChosen} />
			{entry.control === 'condition' && (
				<ConditionBody
					// a new param choice keeps the open preset list, so no key here
					entry={entry}
					chosen={chosen}
					onAdd={onAdd}
				/>
			)}
			{entry.control === 'multi_select' && (
				<MultiSelectBody
					entry={entry}
					chosen={chosen}
					onAdd={onAdd}
					onAddIndexes={onAddIndexes}
				/>
			)}
			{(entry.control === 'date' ||
				entry.control === 'boolean' ||
				entry.control === 'single_select') && (
				<OptionListBody entry={entry} onAdd={onAdd} />
			)}
		</Command>
	);
}

// ---------------------------------------------------------------------------
// Menu: categories -> filters -> filter panel, like TradingView's "+"
// ---------------------------------------------------------------------------

export function AddFilterMenu({
	added,
	onAdd,
	onAddIndexes,
}: {
	added: Record<string, AddedFilter> | undefined;
	onAdd: (next: AddedFilter) => void;
	/** Index picks go to the Index chip (a symbolset, not a filter2 expression). */
	onAddIndexes: (indexes: string[]) => void;
}) {
	const [open, setOpen] = useState(false);
	const [catalog, setCatalog] = useState<AddFilterCatalog>();
	const [loadError, setLoadError] = useState(false);
	const [categoryId, setCategoryId] = useState<string>();
	const [selected, setSelected] = useState<CatalogFilter>();
	const [query, setQuery] = useState('');

	useEffect(() => {
		if (!open || catalog || loadError) return;
		loadCatalog()
			.then(setCatalog)
			.catch(() => setLoadError(true));
	}, [open, catalog, loadError]);

	const reset = () => {
		setCategoryId(undefined);
		setSelected(undefined);
		setQuery('');
	};

	const close = () => {
		setOpen(false);
		reset();
	};

	const category = catalog?.categories.find((c) => c.id === categoryId);
	const q = query.trim().toLowerCase();

	/** Filters to list: one category's, or every category's while searching. */
	const groups = useMemo(() => {
		if (!catalog) return [];
		const pick = (c: CatalogCategory) => ({
			id: c.id,
			heading: c.category,
			filters: c.filters.filter((f) => matches(q, f.label, f.key)),
		});
		if (category) return [pick(category)];
		if (!q) return [];
		return catalog.categories.map(pick).filter((g) => g.filters.length);
	}, [catalog, category, q]);

	const header = selected ? (
		<button
			type="button"
			onClick={() => setSelected(undefined)}
			className="mb-1 flex w-full items-center gap-1.5 rounded-sm px-1 py-1.5 text-left text-sm font-semibold hover:bg-muted cursor-pointer"
		>
			<ChevronLeft className="size-4 shrink-0" />
			<span className="truncate">{selected.label}</span>
		</button>
	) : category ? (
		<button
			type="button"
			onClick={() => {
				setCategoryId(undefined);
				setQuery('');
			}}
			className="mb-1 flex w-full items-center gap-1.5 rounded-sm px-1 py-1.5 text-sm font-semibold hover:bg-muted cursor-pointer"
		>
			<ChevronLeft className="size-4" />
			{category.category}
		</button>
	) : (
		<p className="mb-1 px-1 py-1.5 text-sm font-semibold">Filters</p>
	);

	return (
		<Popover
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (!next) reset();
			}}
		>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className="h-8 gap-1.5 border-dashed font-normal text-foreground hover:bg-muted hover:text-foreground"
				>
					<Plus className="size-3.5" />
					Add filter
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="flex w-96 flex-col overflow-hidden p-2 bg-card text-foreground border-border"
				align="start"
			>
				{!catalog ? (
					<div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
						{loadError ? (
							<>
								Could not load the filter catalog.
								<Button
									size="sm"
									variant="ghost"
									onClick={() => setLoadError(false)}
								>
									Retry
								</Button>
							</>
						) : (
							<>
								<Loader2 className="size-4 animate-spin" />
								Loading filters...
							</>
						)}
					</div>
				) : (
					<>
						{header}
						{selected ? (
							<FilterPanel
								key={selected.key}
								entry={selected}
								onAdd={(next) => {
									onAdd(next);
									close();
								}}
								onAddIndexes={(indexes) => {
									onAddIndexes(indexes);
									close();
								}}
							/>
						) : (
							// filtering is done here: cmdk would score all 261 filters
							<Command
								shouldFilter={false}
								className="min-h-0 flex-1 bg-card text-foreground"
							>
								<CommandInput
									value={query}
									onValueChange={setQuery}
									placeholder={
										category
											? `Search ${category.category.toLowerCase()}...`
											: 'Search filters...'
									}
									className="h-9"
								/>
								<CommandList className="max-h-96 min-h-0 flex-1">
									{(category || q) && <CommandEmpty>No match.</CommandEmpty>}
									{!category && !q && (
										<CommandGroup>
											{catalog.categories.map((c) => {
												const Icon = categoryIcon(c.id);
												const active = c.filters.filter((f) => added?.[f.key]).length;
												return (
													<CommandItem
														key={c.id}
														value={c.id}
														onSelect={() => setCategoryId(c.id)}
														className={cn('py-2', itemClass)}
													>
														<Icon className="size-4 text-foreground" />
														<span className="flex-1">{c.category}</span>
														{active > 0 && (
															<span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
																{active}
															</span>
														)}
														<span className="w-6 text-right text-xs text-muted-foreground">
															{c.filters.length}
														</span>
														<ChevronRight className="size-3.5 text-muted-foreground" />
													</CommandItem>
												);
											})}
										</CommandGroup>
									)}
									{groups.map((g) => (
										<CommandGroup key={g.id} heading={category ? undefined : g.heading}>
											{g.filters.map((f) => (
												<CommandItem
													key={f.key}
													value={f.key}
													onSelect={() => setSelected(f)}
													className={itemClass}
												>
													<span className="flex-1">{f.label}</span>
													{f.thinOnIdx && (
														<span className="text-[10px] text-muted-foreground">
															Limited data
														</span>
													)}
													{added?.[f.key] && (
														<Check className="size-3.5 text-primary" />
													)}
													<ChevronRight className="size-3.5 text-muted-foreground" />
												</CommandItem>
											))}
										</CommandGroup>
									))}
								</CommandList>
							</Command>
						)}
					</>
				)}
			</PopoverContent>
		</Popover>
	);
}
