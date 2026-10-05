'use server';

// Called from the browser as server actions, so requests to the backend go out
// from the Next.js server and the backend needs no CORS config.

import { fetcher } from '@/lib/fetcher';
import {
	financialStatements,
	FinancialStatementsSchema,
} from '../company-profile-schema';

const BASE = '/idx-financial-statements';

/** Unread statements, newest first. */
export const fetchUnreadStatements = async () =>
	fetcher<FinancialStatementsSchema[]>(`${BASE}/unread`, {
		schema: financialStatements.array(),
	});

export const markStatementRead = async (id: string) => {
	await fetcher(`${BASE}/${encodeURIComponent(id)}/read`, {
		method: 'PATCH',
		responseType: 'TEXT',
	});
};

export const markAllStatementsRead = async () => {
	await fetcher(`${BASE}/read-all`, {
		method: 'PATCH',
		responseType: 'TEXT',
	});
};
