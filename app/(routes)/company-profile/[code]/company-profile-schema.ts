import z4 from 'zod/v4';

export const companyProfile = z4.object({
	bae: z4.string().nullable().optional(),
	fax: z4.string().nullable().optional(),
	logo: z4.string().optional(),
	npkp: z4.string().nullable().optional(),
	npwp: z4.string().nullable().optional(),
	email: z4.string().nullable().optional(),
	phone: z4.string().nullable().optional(),
	sector: z4.string(),
	address: z4.string(),
	website: z4.string().nullable().optional(),
	division: z4.string().nullable().optional(),
	industry: z4.string(),
	subSector: z4.string(),
	issuerCode: z4.string(),
	issuerName: z4.string(),
	issuerType: z4.string().nullable().optional(),
	listingDate: z4.string().nullable().optional(),
	subIndustry: z4.string(),
	divisionCode: z4.string().nullable().optional(),
	listingBoard: z4.string(),
	isEbaSecurity: z4.boolean(),
	isEtfSecurity: z4.boolean(),
	isBondSecurity: z4.boolean(),
	isSpeiSecurity: z4.boolean(),
	isStockSecurity: z4.boolean(),
	mainBusinessActivity: z4.string(),
});

export const companySecretary = z4.object({
	fax: z4.string().nullable().optional(),
	name: z4.string().nullable().optional(),
	email: z4.string().nullable().optional(),
	phone: z4.string().nullable().optional(),
	website: z4.string().nullable().optional(),
	mobilePhone: z4.string().nullable().optional(),
});

export const directors = z4.object({
	name: z4.string(),
	position: z4.string(),
	isAffiliate: z4.boolean(),
});
export type DirectorsSchema = z4.infer<typeof directors>;

export const commissioners = z4.object({
	name: z4.string(),
	position: z4.string(),
	isIndependent: z4.boolean(),
});
export type CommissionersSchema = z4.infer<typeof commissioners>;

export const auditCommittee = z4.object({
	name: z4.string(),
	position: z4.string(),
});
export type AuditCommitteeSchema = z4.infer<
	typeof auditCommittee
>;

export const shareholders = z4.object({
	name: z4.string(),
	amount: z4.number(),
	category: z4.string(),
	percentage: z4.number(),
	isController: z4.boolean(),
});
export type ShareholdersSchema = z4.infer<typeof shareholders>;

export const subsidiaries = z4.object({
	name: z4.string(),
	unit: z4.string(),
	currency: z4.string(),
	location: z4.string(),
	percentage: z4.number(),
	assetAmount: z4.number(),
	businessField: z4.string().nullable().optional(),
	commercialYear: z4.string().nullable().optional(),
	operationalStatus: z4.string().nullable().optional(),
});
export type SubsidiariesSchema = z4.infer<typeof subsidiaries>;

export const companyProfileData = z4.object({
	companyProfile: companyProfile,
	companySecretary: companySecretary.optional(),
	directors: directors.array().default([]).optional(),
	commissioners: commissioners.array().default([]).optional(),
	auditCommittee: auditCommittee.array().default([]).optional(),
	shareholders: shareholders.array().default([]).optional(),
	subsidiaries: subsidiaries.array().default([]).optional(),
});

export type CompanyProfileSchema = z4.infer<
	typeof companyProfileData
>;

export const financialStatements = z4.object({
	stockCode: z4.string(),
	reportYear: z4.number(),
	period: z4.string(),
	fileName: z4.string(),
	filePath: z4.string(),
	// used to mark a statement as read
	id: z4.string().optional(),
	isUnread: z4.boolean().optional(),
	/** UTC without a trailing "Z", e.g. "2026-10-05T15:04:00.123456" */
	createdAt: z4.string().nullish(),
});

export type FinancialStatementsSchema = z4.infer<
	typeof financialStatements
>;
