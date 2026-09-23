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
import { Check, ChevronLeft, Loader2, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
	AddFilterCatalog,
	CATALOG_URL,
	CatalogFilter,
	MANUAL_OPERATION_LABELS,
	MANUAL_SAFE_OPERATIONS,
	paramSummary,
	resolveField,
	resolvePreset,
} from '../add-filter-catalog';
import { AddedFilter } from '../fundamental-page-schema';

let catalogPromise: Promise<AddFilterCatalog> | undefined;
const loadCatalog = () => {
	if (!catalogPromise)
		catalogPromise = fetch(CATALOG_URL).then((r) => {
			if (!r.ok) throw new Error('Failed to load filter catalog');
			return r.json() as Promise<AddFilterCatalog>;
		});
	return catalogPromise;
};

const summarizeManual = (operation: string, right: number | number[]) => {
	if (Array.isArray(right)) return `${right[0]} – ${right[1]}`;
	const sign =
		{ greater: '>', egreater: '≥', less: '<', eless: '≤', equal: '=' }[
			operation
		] ?? '';
	return `${sign} ${right}`.trim();
};

const withParamPrefix = (prefix: string, text: string) =>
	prefix ? `${prefix} · ${text}` : text;

function ConditionBody({
	entry,
	chosen,
	onAdd,
}: {
	entry: CatalogFilter;
	chosen: Record<string, string>;
	onAdd: (added: AddedFilter) => void;
}) {
	const manualOps = (entry.operations ?? []).filter((o) =>
		MANUAL_SAFE_OPERATIONS.includes(o)
	);
	const [manual, setManual] = useState(!entry.presets?.length);
	const [operator, setOperator] = useState(
		manualOps.includes('in_range') ? 'in_range' : manualOps[0]
	);
	const [val1, setVal1] = useState('');
	const [val2, setVal2] = useState('');

	const prefix = paramSummary(entry, chosen);
	const parse = (s: string) => (s.trim() === '' ? undefined : Number(s));
	const canApply =
		operator === 'in_range'
			? parse(val1) !== undefined && parse(val2) !== undefined
			: parse(val1) !== undefined;

	const applyManual = () => {
		if (!canApply || !operator) return;
		const a = parse(val1)!;
		const right =
			operator === 'in_range' ? [Math.min(a, parse(val2)!), Math.max(a, parse(val2)!)] : a;
		onAdd({
			key: entry.key,
			label: entry.label,
			summary: withParamPrefix(prefix, summarizeManual(operator, right)),
			expr: { left: resolveField(entry, chosen), operation: operator, right },
		});
	};

	return !manual ? (
		<>
			<div className="max-h-72 overflow-y-auto">
				{entry.presets?.map((p, i) => (
					<button
						key={i}
						type="button"
						onClick={() =>
							onAdd({
								key: entry.key,
								label: entry.label,
								summary: withParamPrefix(prefix, p.title),
								expr: resolvePreset(entry, p, chosen),
							})
						}
						className="flex w-full items-start justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
					>
						<span>
							<span className="block text-foreground">{p.title}</span>
							{p.description && (
								<span className="block text-xs text-muted-foreground">
									{p.description}
								</span>
							)}
						</span>
					</button>
				))}
			</div>
			{manualOps.length > 0 && (
				<div className="mt-1 border-t pt-1">
					<button
						type="button"
						onClick={() => setManual(true)}
						className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
					>
						Manual setup...
					</button>
				</div>
			)}
		</>
	) : (
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
					className="text-xs text-muted-foreground hover:text-foreground"
				>
					Back to presets
				</button>
			)}
			<div className="grid grid-cols-3 gap-1">
				{manualOps.map((op) => (
					<button
						key={op}
						type="button"
						onClick={() => setOperator(op)}
						className={cn(
							'rounded-sm border px-2 py-1 text-xs',
							operator === op
								? 'border-primary bg-primary/10 text-primary'
								: 'border-border text-muted-foreground hover:text-foreground'
						)}
					>
						{MANUAL_OPERATION_LABELS[op] ?? op}
					</button>
				))}
			</div>
			<div className="flex items-center gap-2">
				<Input
					value={val1}
					onChange={(e) => setVal1(e.target.value)}
					placeholder={operator === 'in_range' ? 'Min' : 'Value'}
					inputMode="decimal"
					className="h-8 dark:bg-muted"
				/>
				{operator === 'in_range' && (
					<>
						<span className="text-muted-foreground">–</span>
						<Input
							value={val2}
							onChange={(e) => setVal2(e.target.value)}
							placeholder="Max"
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
}: {
	entry: CatalogFilter;
	chosen: Record<string, string>;
	onAdd: (added: AddedFilter) => void;
}) {
	const [selected, setSelected] = useState<string[]>([]);
	const values = entry.values ?? [];
	const prefix = paramSummary(entry, chosen);

	const toggle = (v: string) =>
		setSelected((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));

	const add = () => {
		if (!selected.length) return;
		const summary =
			selected.length === 1
				? values.find((v) => String(v.value) === selected[0])?.label ?? selected[0]
				: `${selected.length} selected`;
		onAdd({
			key: entry.key,
			label: entry.label,
			summary: withParamPrefix(prefix, summary),
			expr: {
				left: resolveField(entry, chosen),
				operation: entry.operation ?? 'in_range',
				right: selected,
			},
		});
	};

	return (
		<>
			<Command className="bg-card text-foreground">
				<CommandInput placeholder={`Search ${entry.label.toLowerCase()}...`} className="h-9" />
				<CommandList className="max-h-56">
					<CommandEmpty>No match.</CommandEmpty>
					<CommandGroup>
						{values.map((v) => {
							const key = String(v.value);
							const on = selected.includes(key);
							return (
								<CommandItem
									key={key}
									value={v.label}
									onSelect={() => toggle(key)}
									className="text-foreground data-[selected=true]:bg-muted data-[selected=true]:text-foreground"
								>
									<span
										className={cn(
											'flex size-4 items-center justify-center rounded-sm border',
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
			</Command>
			<div className="mt-1 flex justify-end border-t pt-2">
				<Button size="sm" disabled={!selected.length} onClick={add}>
					Add filter{selected.length ? ` (${selected.length})` : ''}
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
		<div className="max-h-72 overflow-y-auto">
			{entry.options?.map((o, i) => (
				<button
					key={i}
					type="button"
					onClick={() =>
						onAdd({
							key: entry.key,
							label: entry.label,
							summary: o.label,
							expr: o.filter[0],
						})
					}
					className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
				>
					{o.label}
				</button>
			))}
		</div>
	);
}

function ConfigurePanel({
	entry,
	onAdd,
	onBack,
}: {
	entry: CatalogFilter;
	onAdd: (added: AddedFilter) => void;
	onBack: () => void;
}) {
	const [chosen, setChosen] = useState<Record<string, string>>(
		Object.fromEntries((entry.params ?? []).map((p) => [p.name, p.default]))
	);

	return (
		<div className="space-y-2">
			<div className="flex items-center gap-1">
				<button
					type="button"
					onClick={onBack}
					className="flex items-center gap-1 rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
					aria-label="Back to filter list"
				>
					<ChevronLeft className="size-4" />
				</button>
				<div>
					<p className="text-sm font-medium leading-tight">{entry.label}</p>
					{entry.note && (
						<p className="text-xs text-muted-foreground">{entry.note}</p>
					)}
					{entry.thinOnIdx && (
						<p className="text-xs text-amber-500">Limited coverage on IDX</p>
					)}
				</div>
			</div>

			{entry.params?.map((p) => (
				<select
					key={p.name}
					value={chosen[p.name] ?? p.default}
					onChange={(e) =>
						setChosen((c) => ({ ...c, [p.name]: e.target.value }))
					}
					className="w-full rounded-sm border border-border bg-transparent px-2 py-1.5 text-sm dark:bg-muted"
				>
					{p.options.map((o) => (
						<option key={o.value} value={o.value}>
							{p.title}: {o.label}
						</option>
					))}
				</select>
			))}

			{entry.control === 'condition' && (
				<ConditionBody entry={entry} chosen={chosen} onAdd={onAdd} />
			)}
			{entry.control === 'multi_select' && (
				<MultiSelectBody entry={entry} chosen={chosen} onAdd={onAdd} />
			)}
			{(entry.control === 'date' ||
				entry.control === 'boolean' ||
				entry.control === 'single_select') && (
				<OptionListBody entry={entry} onAdd={onAdd} />
			)}
		</div>
	);
}

export function AddFilterMenu({
	added,
	onAdd,
}: {
	added: Record<string, AddedFilter> | undefined;
	onAdd: (next: AddedFilter) => void;
}) {
	const [open, setOpen] = useState(false);
	const [catalog, setCatalog] = useState<AddFilterCatalog>();
	const [loadError, setLoadError] = useState(false);
	const [selected, setSelected] = useState<CatalogFilter>();

	useEffect(() => {
		if (!open || catalog || loadError) return;
		loadCatalog()
			.then(setCatalog)
			.catch(() => setLoadError(true));
	}, [open, catalog, loadError]);

	const handleAdd = (next: AddedFilter) => {
		onAdd(next);
		setOpen(false);
		setSelected(undefined);
	};

	return (
		<Popover
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (!next) setSelected(undefined);
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
				className="w-80 p-2 bg-card text-foreground border-border"
				align="start"
			>
				{!catalog ? (
					<div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
						{loadError ? (
							'Could not load the filter catalog.'
						) : (
							<>
								<Loader2 className="size-4 animate-spin" />
								Loading filters...
							</>
						)}
					</div>
				) : selected ? (
					<ConfigurePanel
						entry={selected}
						onAdd={handleAdd}
						onBack={() => setSelected(undefined)}
					/>
				) : (
					<Command className="bg-card text-foreground">
						<CommandInput placeholder="Search filters..." className="h-9" />
						<CommandList className="max-h-96">
							<CommandEmpty>No match.</CommandEmpty>
							{catalog.categories.map((cat) => (
								<CommandGroup key={cat.category} heading={cat.category}>
									{cat.filters.map((f) => (
										<CommandItem
											key={f.key}
											value={f.label}
											onSelect={() => setSelected(f)}
											className="text-foreground data-[selected=true]:bg-muted data-[selected=true]:text-foreground"
										>
											<span className="flex-1">{f.label}</span>
											{added?.[f.key] && (
												<Check className="size-3.5 text-primary" />
											)}
											{f.thinOnIdx && (
												<span className="text-xs text-muted-foreground">
													Limited data
												</span>
											)}
										</CommandItem>
									))}
								</CommandGroup>
							))}
						</CommandList>
					</Command>
				)}
			</PopoverContent>
		</Popover>
	);
}
