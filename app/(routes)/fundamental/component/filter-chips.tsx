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
import { useEffect, useState } from 'react';
import { abbreviate, parseAbbreviated } from '../format';
import { RangeValue } from '../fundamental-page-schema';
import { RangeChip as RangeChipDef } from '../screener-config';

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

const showValue = (n: number | undefined, unit: RangeChipDef['unit']) => {
	if (n === undefined) return '';
	if (unit === 'abbr')
		return abbreviate(n)
			.replace(/(\.\d*?)0+(?= |$)/, '$1')
			.replace(/\.(?= |$)/, '')
			.replace(/[, ]/g, '');
	return String(n);
};

const rangeSummary = (v: RangeValue | undefined, unit: RangeChipDef['unit']) => {
	if (!v || (v.min === undefined && v.max === undefined)) return undefined;
	const pct = unit === 'percent' ? '%' : '';
	const a = showValue(v.min, unit);
	const b = showValue(v.max, unit);
	if (a && b) return `${a}${pct} – ${b}${pct}`;
	if (a) return `≥ ${a}${pct}`;
	return `≤ ${b}${pct}`;
};

export function RangeChip({
	chip,
	value,
	onChange,
}: {
	chip: RangeChipDef;
	value?: RangeValue;
	onChange: (next: RangeValue | undefined) => void;
}) {
	const [open, setOpen] = useState(false);
	const [min, setMin] = useState('');
	const [max, setMax] = useState('');

	useEffect(() => {
		if (open) {
			setMin(showValue(value?.min, chip.unit));
			setMax(showValue(value?.max, chip.unit));
		}
	}, [open, value, chip.unit]);

	const parse = (s: string) =>
		chip.unit === 'abbr'
			? parseAbbreviated(s)
			: s.trim() === ''
			? undefined
			: Number(s.replace(/,/g, ''));

	const apply = () => {
		const next = { min: parse(min), max: parse(max) };
		const valid = (n?: number) => n !== undefined && !isNaN(n);
		onChange(
			valid(next.min) || valid(next.max)
				? {
						min: valid(next.min) ? next.min : undefined,
						max: valid(next.max) ? next.max : undefined,
				  }
				: undefined
		);
		setOpen(false);
	};

	const placeholder =
		chip.unit === 'abbr' ? 'e.g. 10T' : chip.unit === 'percent' ? '%' : '';

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<span>
					<ChipButton
						label={chip.label}
						value={rangeSummary(value, chip.unit)}
						active={!!rangeSummary(value, chip.unit)}
						onClear={() => onChange(undefined)}
					/>
				</span>
			</PopoverTrigger>
			<PopoverContent className="w-64 bg-card text-foreground border-border" align="start">
				<form
					className="space-y-3"
					onSubmit={(e) => {
						e.preventDefault();
						apply();
					}}
				>
					<p className="text-sm font-medium">{chip.label}</p>
					<div className="flex items-center gap-2">
						<Input
							value={min}
							onChange={(e) => setMin(e.target.value)}
							placeholder={`Min ${placeholder}`}
							inputMode="decimal"
							className="h-8 dark:bg-muted"
						/>
						<span className="text-muted-foreground">–</span>
						<Input
							value={max}
							onChange={(e) => setMax(e.target.value)}
							placeholder={`Max ${placeholder}`}
							inputMode="decimal"
							className="h-8 dark:bg-muted"
						/>
					</div>
					{chip.unit === 'abbr' && (
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
						<Button type="submit" size="sm">
							Apply
						</Button>
					</div>
				</form>
			</PopoverContent>
		</Popover>
	);
}

export function DaysChip({
	label,
	prefix,
	options,
	value,
	onChange,
}: {
	label: string;
	prefix: string;
	options: { value: number; label: string }[];
	value?: number;
	onChange: (next: number | undefined) => void;
}) {
	const [open, setOpen] = useState(false);
	const current = options.find((o) => o.value === value);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<span>
					<ChipButton
						label={label}
						value={
							current
								? current.value === 0
									? current.label
									: `${prefix} ${current.label}`
								: undefined
						}
						active={!!current}
						onClear={() => onChange(undefined)}
					/>
				</span>
			</PopoverTrigger>
			<PopoverContent className="w-44 p-1 bg-card text-foreground border-border" align="start">
				{options.map((o) => (
					<button
						key={o.value}
						type="button"
						onClick={() => {
							onChange(o.value === value ? undefined : o.value);
							setOpen(false);
						}}
						className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm text-foreground hover:bg-muted"
					>
						{o.value === 0 ? o.label : `${prefix} ${o.label}`}
						{o.value === value && <Check className="size-4" />}
					</button>
				))}
			</PopoverContent>
		</Popover>
	);
}
