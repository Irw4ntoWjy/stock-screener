// Types + helpers for the "+ Add filter" catalog
// (public/data/idx-add-filter-catalog.json): TradingView's own filter menu,
// category for category, with its presets, titles and descriptions, and every
// preset already converted to the scanner `filter2` operand TradingView sends.
// Fetched lazily, client-side, the first time the "+ Add filter" popover opens.

import type { ScanExpression, ScanOperand } from './fundamental-page-schema';

export type CatalogControl =
	| 'condition'
	| 'multi_select'
	| 'date'
	| 'boolean'
	| 'single_select';

export type CatalogParamOption = {
	label: string;
	value: string;
	/** Scanner field with this option and every other param at its default. */
	field: string;
};

export type CatalogParam = {
	name: string; // fiscalPeriod, resolution, length, plot, ...
	title: string;
	default: string;
	options: CatalogParamOption[];
};

export type CatalogPreset = {
	title: string; // "Above 70"
	description?: string; // "Overbought"
	/** Params of the left column that follow the user's choice (TradingView syncConfig). */
	sync?: string[];
	operand: ScanOperand;
};

export type CatalogValue = {
	value: string | number | boolean;
	label: string;
	/** Set when picking this value is more than `field in [values]`. */
	operand?: ScanOperand;
	/** Index membership: a scanner symbolset rather than a filter2 expression. */
	symbolset?: string[];
};

export type CatalogOption = {
	label: string;
	value: string | number | boolean;
	operand: ScanOperand;
};

export type CatalogFilter = {
	key: string; // TradingView filter id, e.g. "RelativeStrengthIndex"
	label: string;
	control: CatalogControl;
	/** Scanner field with every param at its default. */
	field: string | null;
	params?: CatalogParam[];
	idxCoveragePct?: number;
	thinOnIdx?: boolean;
	// control: "condition"
	operations?: string[];
	presets?: CatalogPreset[];
	// control: "multi_select"
	operation?: string;
	values?: CatalogValue[];
	/** Routes the picks to a built-in chip instead of a custom filter. */
	target?: 'indexes';
	// control: "date" | "boolean" | "single_select"
	options?: CatalogOption[];
};

export type CatalogCategory = {
	id: string; // securityInfo, marketData, ...
	category: string; // "Security info"
	filters: CatalogFilter[];
};

export type AddFilterCatalog = {
	source: string;
	generatedAt: string;
	operationNames: Record<string, string>;
	categories: CatalogCategory[];
};

export const CATALOG_URL = '/data/idx-add-filter-catalog.json';

/** UI label for the manual-setup operator picker (field-to-field ops like crosses stay preset-only). */
export const MANUAL_OPERATION_LABELS: Record<string, string> = {
	greater: 'Above',
	egreater: 'Above or equal',
	less: 'Below',
	eless: 'Below or equal',
	in_range: 'Between',
	not_in_range: 'Outside',
	equal: 'Equal',
};

export type ParamChoice = Record<string, string>;

export const defaultChoice = (entry: CatalogFilter): ParamChoice =>
	Object.fromEntries((entry.params ?? []).map((p) => [p.name, p.default]));

/**
 * The text edit one param makes to the default field, e.g. length 50 turns
 * `RSI` into `RSI50`, interval 1 hour turns it into `RSI|60`.
 */
const paramEdit = (base: string, changed: string) => {
	let p = 0;
	while (p < base.length && p < changed.length && base[p] === changed[p]) p++;
	let s = 0;
	while (
		s < base.length - p &&
		s < changed.length - p &&
		base[base.length - 1 - s] === changed[changed.length - 1 - s]
	)
		s++;
	return {
		at: p,
		from: base.slice(p, base.length - s),
		to: changed.slice(p, changed.length - s),
	};
};

/**
 * Apply the chosen params to a field that was built with the defaults. Edits go
 * right to left so earlier positions stay valid: `BB.upper` + plot Lower +
 * length 50 = `BB.lower_50`.
 */
export function applyParams(
	entry: CatalogFilter,
	field: string,
	chosen: ParamChoice,
	only?: string[]
): string {
	if (!entry.field) return field;
	const edits = (entry.params ?? [])
		.filter((p) => !only || only.includes(p.name))
		.map((p) => {
			const v = chosen[p.name] ?? p.default;
			if (v === p.default) return null;
			const opt = p.options.find((o) => o.value === v);
			return opt ? paramEdit(entry.field!, opt.field) : null;
		})
		.filter((e): e is NonNullable<typeof e> => !!e)
		// at the same spot the interval suffix goes in first so it ends up
		// last: RSI + length 7 + 1 hour = RSI7|60
		.sort(
			(a, b) =>
				b.at - a.at ||
				Number(b.to.startsWith('|')) - Number(a.to.startsWith('|'))
		);
	let out = field;
	for (const e of edits)
		if (out.slice(e.at, e.at + e.from.length) === e.from)
			out = out.slice(0, e.at) + e.to + out.slice(e.at + e.from.length);
	return out;
}

/** The scanner field for the user's param choices. */
export const resolveField = (entry: CatalogFilter, chosen: ParamChoice) =>
	entry.field ? applyParams(entry, entry.field, chosen) : '';

/** Retarget the left side of every expression in an operand. */
const mapExpressions = (
	op: ScanOperand,
	fn: (e: ScanExpression) => ScanExpression
): ScanOperand =>
	'expression' in op
		? { expression: fn(op.expression) }
		: {
				operation: {
					...op.operation,
					operands: op.operation.operands.map((o) => mapExpressions(o, fn)),
				},
			};

/** A preset for the user's params: only the params TradingView syncs move. */
export const resolvePreset = (
	entry: CatalogFilter,
	preset: CatalogPreset,
	chosen: ParamChoice
): ScanOperand =>
	preset.sync?.length
		? mapExpressions(preset.operand, (e) => ({
				...e,
				left: applyParams(entry, e.left, chosen, preset.sync),
			}))
		: preset.operand;

/** Multi-select picks -> one operand (`field in [...]`, or an OR of per-value groups). */
export function multiSelectOperand(
	entry: CatalogFilter,
	picked: CatalogValue[],
	chosen: ParamChoice
): ScanOperand | undefined {
	if (!picked.length) return undefined;
	const field = resolveField(entry, chosen);
	if (picked.every((v) => !v.operand) && field)
		return {
			expression: {
				left: field,
				operation: entry.operation ?? 'in_range',
				right: picked.map((v) => v.value),
			},
		};
	const parts = picked.map((v) =>
		mapExpressions(
			v.operand ?? {
				expression: {
					left: entry.field ?? '',
					operation: entry.operation ?? 'in_range',
					right: [v.value],
				},
			},
			(e) => (e.left === entry.field ? { ...e, left: field } : e)
		)
	);
	return parts.length === 1
		? parts[0]
		: { operation: { operator: 'or', operands: parts } };
}

/** Non-default param choices, rendered as a chip prefix, e.g. "1 hour". */
export function paramSummary(
	entry: CatalogFilter,
	chosen: ParamChoice
): string {
	const parts: string[] = [];
	for (const p of entry.params ?? []) {
		const v = chosen[p.name] ?? p.default;
		if (v === p.default) continue;
		const opt = p.options.find((o) => o.value === v);
		if (opt) parts.push(opt.label);
	}
	return parts.join(', ');
}
