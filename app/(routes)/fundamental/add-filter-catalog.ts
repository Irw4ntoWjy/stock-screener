// Types + helpers for the TradingView "+ Add filter" catalog
// (public/data/idx-add-filter-catalog.json — 247 filters across 8 categories,
// captured straight from the live screener's own config). Fetched lazily,
// client-side, the first time the "+ Add filter" popover opens.

export type CatalogControl =
	| 'condition'
	| 'multi_select'
	| 'date'
	| 'boolean'
	| 'single_select';

export type CatalogParamOption = {
	label: string;
	value: string;
	field: string;
};

export type CatalogParam = {
	name: string;
	title: string;
	default: string;
	options: CatalogParamOption[];
};

export type CatalogPreset = {
	title: string;
	description?: string | null;
	filter: { left: string; operation: string; right: unknown };
};

export type CatalogValue = { value: string | number; label: string };

export type CatalogOption = {
	label: string;
	value: string | number | boolean;
	filter: { left: string; operation: string; right: unknown }[];
};

export type CatalogFilter = {
	key: string;
	label: string;
	control: CatalogControl;
	field: string | null;
	note?: string;
	idxCoverage: number | null;
	idxCoveragePct?: number;
	thinOnIdx?: boolean;
	params?: CatalogParam[];
	// control: "condition"
	operations?: string[];
	presets?: CatalogPreset[];
	// control: "multi_select"
	operation?: string;
	values?: CatalogValue[];
	// control: "date" | "boolean" | "single_select"
	options?: CatalogOption[];
};

export type CatalogCategory = {
	category: string;
	filters: CatalogFilter[];
};

export type AddFilterCatalog = {
	source: string;
	universeSize: number;
	notes: string[];
	operationNames: Record<string, string>;
	categories: CatalogCategory[];
	removedForIdx: {
		category: string;
		key: string;
		label: string;
		field: string;
		reason: string;
	}[];
};

export const CATALOG_URL = '/data/idx-add-filter-catalog.json';

/** What a filter contributes to `filter2` once configured. */
export type AddedFilter = {
	key: string;
	label: string;
	summary: string;
	expr: { left: string; operation: string; right: unknown };
};

/** UI label for the manual-setup operator picker (field-to-field ops like crosses/above% stay preset-only). */
export const MANUAL_OPERATION_LABELS: Record<string, string> = {
	greater: 'Above',
	egreater: 'Above or equal',
	less: 'Below',
	eless: 'Below or equal',
	in_range: 'Between',
	not_in_range: 'Outside',
	equal: 'Equal',
};

/** Operators safe for the generic numeric manual-setup UI. */
export const MANUAL_SAFE_OPERATIONS = Object.keys(MANUAL_OPERATION_LABELS);

/** The field a "condition" / "multi_select" entry resolves to given the user's current param choices (§8 / §12.1). */
export function resolveField(
	entry: CatalogFilter,
	chosen: Record<string, string>
): string {
	let base = entry.field ?? '';
	let suffix = '';
	for (const p of entry.params ?? []) {
		const v = chosen[p.name] ?? p.default;
		if (v === p.default) continue;
		const opt = p.options.find((o) => o.value === v);
		if (!opt) continue;
		if (entry.field && opt.field.startsWith(entry.field + '|')) {
			suffix = opt.field.slice(entry.field.length);
		} else {
			base = opt.field;
		}
	}
	return base + suffix;
}

/** The interval-only suffix implied by the current params (e.g. "|60"), used to retarget a preset onto a non-default field. */
const resolveIntervalSuffix = (
	entry: CatalogFilter,
	chosen: Record<string, string>
) => {
	const interval = entry.params?.find((p) => p.name === 'resolution');
	if (!interval || !entry.field) return '';
	const v = chosen[interval.name] ?? interval.default;
	if (v === interval.default) return '';
	const opt = interval.options.find((o) => o.value === v);
	if (!opt) return '';
	return opt.field.startsWith(entry.field + '|')
		? opt.field.slice(entry.field.length)
		: '';
};

/** Retarget a preset's field(s) for the current param choices. */
export function resolvePreset(
	entry: CatalogFilter,
	preset: CatalogPreset,
	chosen: Record<string, string>
): { left: string; operation: string; right: unknown } {
	const resolved = resolveField(entry, chosen);
	const suffix = resolveIntervalSuffix(entry, chosen);
	const retarget = (field: string) =>
		field === entry.field ? resolved : suffix ? field + suffix : field;

	return {
		left: retarget(preset.filter.left),
		operation: preset.filter.operation,
		right:
			typeof preset.filter.right === 'string'
				? retarget(preset.filter.right)
				: preset.filter.right,
	};
}

/** Non-default param choices, rendered as a chip prefix, e.g. "1 hour". */
export function paramSummary(
	entry: CatalogFilter,
	chosen: Record<string, string>
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
