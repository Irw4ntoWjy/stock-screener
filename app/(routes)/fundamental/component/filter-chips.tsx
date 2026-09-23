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
import { Check, ChevronDown, X } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { abbreviate, parseAbbreviated } from '../format';
import { AddedFilter, ConditionValue } from '../fundamental-page-schema';
import {
	CHANGE_LIKE_OPTIONS,
	ConditionChipDef,
	ConditionOption,
	DateRangeOption,
	PERF_DEFAULT_FIELD,
	PERF_PERIODS,
} from '../screener-config';

function ChipButton({
	label,
	value,
	active,
	onClear,
}: {
	label: string;
	value?: string;
	active: boolean;
	onClear: () => void;
}) {
	return (
		<Button
			variant="outline"
			size="sm"
			className={cn(
				'h-8 gap-1.5 font-normal text-foreground hover:bg-muted hover:text-foreground',
				active && 'border-primary bg-primary/10 text-primary'
			)}
		>
			<span>{label}</span>
			{value && (
				<span className="max-w-[160px] truncate font-medium">
					{value}
				</span>
			)}
			{active ? (
				<span
					role="button"
					aria-label={`Clear ${label}`}
					onClick={(e) => {
						// don't open the popover when clearing
						e.preventDefault();
						e.stopPropagation();
						onClear();
					}}
					className="rounded-sm hover:bg-primary/20"
				>
					<X className="size-3.5" />
				</span>
			) : (
				<ChevronDown className="size-3.5 opacity-60" />
			)}
		</Button>
	);
}

export function MultiSelectChip({
	label,
	options,
	selected,
	onChange,
	searchable = true,
}: {
	label: string;
	options: { value: string; label: string }[];
	selected: string[];
	onChange: (next: string[]) => void;
	searchable?: boolean;
}) {
	const summary =
		selected.length === 0
			? undefined
			: selected.length === 1
			? options.find((o) => o.value === selected[0])?.label
			: `${selected.length} selected`;

	const toggle = (value: string) =>
		onChange(
			selected.includes(value)
				? selected.filter((v) => v !== value)
				: [...selected, value]
		);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<span>
					<ChipButton
						label={label}
						value={summary}
						active={selected.length > 0}
						onClear={() => onChange([])}
					/>
				</span>
			</PopoverTrigger>
			<PopoverContent className="w-64 p-0 bg-card text-foreground border-border" align="start">
				<Command className="bg-card text-foreground">
					{searchable && (
						<CommandInput
							placeholder={`Search ${label.toLowerCase()}...`}
							className="h-9"
						/>
					)}
					<CommandList>
						<CommandEmpty>No match.</CommandEmpty>
						<CommandGroup>
							{options.map((o) => {
								const on = selected.includes(o.value);
								return (
									<CommandItem
										key={o.value}
										value={o.label}
										onSelect={() => toggle(o.value)}
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
										{o.label}
									</CommandItem>
								);
							})}
						</CommandGroup>
					</CommandList>
					{selected.length > 0 && (
						<div className="border-t p-1">
							<Button
								variant="ghost"
								size="sm"
								className="w-full hover:bg-muted hover:text-foreground"
								onClick={() => onChange([])}
							>
								Clear
							</Button>
						</div>
					)}
				</Command>
			</PopoverContent>
		</Popover>
	);
}

// ---------------------------------------------------------------------------
// Condition chip — a TradingView-style preset dropdown (Price, Mkt cap, P/E, ...)
// with a "Manual setup" fallback for a free operator + value.
// ---------------------------------------------------------------------------

type ManualOperator = 'greater' | 'egreater' | 'less' | 'eless' | 'equal' | 'in_range';

const MANUAL_OPERATORS: { value: ManualOperator; label: string }[] = [
	{ value: 'greater', label: '>' },
	{ value: 'egreater', label: '≥' },
	{ value: 'less', label: '<' },
	{ value: 'eless', label: '≤' },
	{ value: 'equal', label: '=' },
	{ value: 'in_range', label: 'Range' },
];

const sameRight = (a: unknown, b: unknown) =>
	Array.isArray(a) && Array.isArray(b)
		? a.length === b.length && a.every((v, i) => v === b[i])
		: a === b;

const findMatchingOption = (
	options: ConditionOption[],
	value: ConditionValue | undefined
) =>
	value
		? options.find(
				(o) => o.operation === value.operation && sameRight(o.right, value.right)
		  )
		: undefined;

const fmtVal = (n: number, unit: ConditionChipDef['unit']) =>
	unit === 'abbr'
		? abbreviate(n)
				.replace(/(\.\d*?)0+(?= |$)/, '$1')
				.replace(/\.(?= |$)/, '')
				.replace(/[, ]/g, '')
		: String(n);

const OPERATOR_SIGNS: Record<string, string> = {
	greater: '>',
	egreater: '≥',
	less: '<',
	eless: '≤',
	equal: '=',
};

const summarizeManual = (
	value: ConditionValue,
	unit: ConditionChipDef['unit']
) => {
	const suffix = unit === 'percent' ? '%' : '';
	const { operation, right } = value;
	if (Array.isArray(right))
		return `${fmtVal(right[0], unit)}${suffix} – ${fmtVal(right[1], unit)}${suffix}`;
	if (typeof right !== 'number') return String(right);
	return `${OPERATOR_SIGNS[operation] ?? ''} ${fmtVal(right, unit)}${suffix}`;
};

export function ConditionChip({
	def,
	value,
	onChange,
	header,
}: {
	def: ConditionChipDef;
	value?: ConditionValue;
	onChange: (next: ConditionValue | undefined) => void;
	header?: ReactNode;
}) {
	const [open, setOpen] = useState(false);
	const [manual, setManual] = useState(false);
	const [operator, setOperator] = useState<ManualOperator>('in_range');
	const [val1, setVal1] = useState('');
	const [val2, setVal2] = useState('');

	const matched = findMatchingOption(def.options, value);
	const summary = matched?.label ?? (value ? summarizeManual(value, def.unit) : undefined);

	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(() => {
		if (!open) return;
		if (value && !matched) {
			setManual(true);
			if (Array.isArray(value.right)) {
				setOperator('in_range');
				setVal1(fmtVal(value.right[0], def.unit));
				setVal2(fmtVal(value.right[1], def.unit));
			} else if (typeof value.right === 'number') {
				setOperator(value.operation as ManualOperator);
				setVal1(fmtVal(value.right, def.unit));
				setVal2('');
			}
		} else {
			setManual(false);
			setOperator('in_range');
			setVal1('');
			setVal2('');
		}
	}, [open]);

	const parse = (s: string) =>
		def.unit === 'abbr'
			? parseAbbreviated(s)
			: s.trim() === ''
			? undefined
			: Number(s.replace(/,/g, ''));

	const canApply =
		operator === 'in_range'
			? parse(val1) !== undefined && parse(val2) !== undefined
			: parse(val1) !== undefined;

	const applyManual = () => {
		if (!canApply) return;
		if (operator === 'in_range') {
			const a = parse(val1)!;
			const b = parse(val2)!;
			onChange({ operation: 'in_range', right: [Math.min(a, b), Math.max(a, b)] });
		} else {
			onChange({ operation: operator, right: parse(val1)! });
		}
		setOpen(false);
	};

	const placeholder =
		def.unit === 'abbr' ? 'e.g. 10T' : def.unit === 'percent' ? '%' : '';

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<span>
					<ChipButton
						label={def.label}
						value={summary}
						active={!!summary}
						onClear={() => onChange(undefined)}
					/>
				</span>
			</PopoverTrigger>
			<PopoverContent className="w-72 p-2 bg-card text-foreground border-border" align="start">
				{header}
				{!manual ? (
					<>
						<div className="max-h-72 overflow-y-auto">
							{def.options.map((o, i) => {
								const on = o === matched;
								return (
									<button
										key={i}
										type="button"
										onClick={() => {
											onChange({ operation: o.operation, right: o.right });
											setOpen(false);
										}}
										className="flex w-full items-start justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
									>
										<span>
											<span className="block text-foreground">{o.label}</span>
											{o.subtitle && (
												<span className="block text-xs text-muted-foreground">
													{o.subtitle}
												</span>
											)}
										</span>
										{on && <Check className="mt-0.5 size-4 shrink-0" />}
									</button>
								);
							})}
						</div>
						<div className="mt-1 border-t pt-1">
							<button
								type="button"
								onClick={() => setManual(true)}
								className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
							>
								Manual setup...
							</button>
						</div>
					</>
				) : (
					<form
						className="space-y-3 p-1"
						onSubmit={(e) => {
							e.preventDefault();
							applyManual();
						}}
					>
						<div className="flex items-center justify-between">
							<p className="text-sm font-medium">{def.label}</p>
							<button
								type="button"
								onClick={() => setManual(false)}
								className="text-xs text-muted-foreground hover:text-foreground"
							>
								Back to presets
							</button>
						</div>
						<div className="grid grid-cols-3 gap-1">
							{MANUAL_OPERATORS.map((op) => (
								<button
									key={op.value}
									type="button"
									onClick={() => setOperator(op.value)}
									className={cn(
										'rounded-sm border px-2 py-1 text-xs',
										operator === op.value
											? 'border-primary bg-primary/10 text-primary'
											: 'border-border text-muted-foreground hover:text-foreground'
									)}
								>
									{op.label}
								</button>
							))}
						</div>
						<div className="flex items-center gap-2">
							<Input
								value={val1}
								onChange={(e) => setVal1(e.target.value)}
								placeholder={operator === 'in_range' ? `Min ${placeholder}` : placeholder}
								inputMode="decimal"
								className="h-8 dark:bg-muted"
							/>
							{operator === 'in_range' && (
								<>
									<span className="text-muted-foreground">–</span>
									<Input
										value={val2}
										onChange={(e) => setVal2(e.target.value)}
										placeholder={`Max ${placeholder}`}
										inputMode="decimal"
										className="h-8 dark:bg-muted"
									/>
								</>
							)}
						</div>
						{def.unit === 'abbr' && (
							<p className="text-xs text-muted-foreground">
								Use K, M, B, T — e.g. 500B or 10T
							</p>
						)}
						<div className="flex justify-end gap-2">
							<Button
								type="button"
								size="sm"
								variant="ghost"
								className="hover:bg-muted hover:text-foreground"
								onClick={() => {
									onChange(undefined);
									setOpen(false);
								}}
							>
								Clear
							</Button>
							<Button type="submit" size="sm" disabled={!canApply}>
								Apply
							</Button>
						</div>
					</form>
				)}
			</PopoverContent>
		</Popover>
	);
}

/** The "Perf %" chip: same value ladder as Chg %, but a date-range switch picks the field. */
export function PerfConditionChip({
	conditions,
	setCondition,
}: {
	conditions: Record<string, ConditionValue> | undefined;
	setCondition: (field: string, value: ConditionValue | undefined) => void;
}) {
	const activeField =
		PERF_PERIODS.find((p) => conditions?.[p.field])?.field ?? PERF_DEFAULT_FIELD;
	const [period, setPeriod] = useState(activeField);

	useEffect(() => {
		setPeriod(activeField);
	}, [activeField]);

	const def: ConditionChipDef = {
		field: period,
		label: 'Perf %',
		unit: 'percent',
		options: CHANGE_LIKE_OPTIONS,
	};

	return (
		<ConditionChip
			def={def}
			value={conditions?.[period]}
			onChange={(next) => {
				if (activeField !== period) setCondition(activeField, undefined);
				setCondition(period, next);
			}}
			header={
				<select
					value={period}
					onChange={(e) => setPeriod(e.target.value)}
					className="mb-2 w-full rounded-sm border border-border bg-transparent px-2 py-1.5 text-sm dark:bg-muted"
				>
					{PERF_PERIODS.map((p) => (
						<option key={p.field} value={p.field}>
							{p.label}
						</option>
					))}
				</select>
			}
		/>
	);
}

/** A filter added through the "+ Add filter" catalog picker. Remove-only; re-add via the menu to reconfigure. */
export function AddedFilterChip({
	added,
	onRemove,
}: {
	added: AddedFilter;
	onRemove: () => void;
}) {
	return (
		<ChipButton
			label={added.label}
			value={added.summary}
			active
			onClear={onRemove}
		/>
	);
}

// ---------------------------------------------------------------------------
// Date-range chip — Recent / upcoming earnings date presets.
// ---------------------------------------------------------------------------

export function DateRangeChip({
	label,
	options,
	value,
	onChange,
}: {
	label: string;
	options: DateRangeOption[];
	value?: ConditionValue;
	onChange: (next: ConditionValue | undefined) => void;
}) {
	const [open, setOpen] = useState(false);
	const matched = options.find(
		(o) =>
			value &&
			o.operation === value.operation &&
			Array.isArray(value.right) &&
			o.right[0] === value.right[0] &&
			o.right[1] === value.right[1]
	);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<span>
					<ChipButton
						label={label}
						value={matched?.label}
						active={!!matched}
						onClear={() => onChange(undefined)}
					/>
				</span>
			</PopoverTrigger>
			<PopoverContent className="w-56 p-1 bg-card text-foreground border-border" align="start">
				{options.map((o) => (
					<button
						key={o.label}
						type="button"
						onClick={() => {
							onChange({ operation: o.operation, right: o.right });
							setOpen(false);
						}}
						className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm text-foreground hover:bg-muted"
					>
						{o.label}
						{o === matched && <Check className="size-4" />}
					</button>
				))}
			</PopoverContent>
		</Popover>
	);
}
