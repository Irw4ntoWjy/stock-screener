import { connection } from 'next/server';
import { ScreenerResult } from './fundamental-page-schema';
import FundamentalPage from './fundamental-page';
import { scanIdxStocks } from './server/fetch-fundamental-data';

export default async function Fundamental() {
	// render per request (never at build time) — the data is live
	await connection();

	let initialData: ScreenerResult = {
		rows: [],
		totalCount: 0,
		fetchedAt: Date.now(),
	};
	let initialError: string | undefined;

	try {
		initialData = await scanIdxStocks({ tab: 'overview' });
	} catch (e) {
		initialError =
			e instanceof Error ? e.message : 'Failed to load data';
	}

	return (
		<FundamentalPage
			initialData={initialData}
			initialError={initialError}
		/>
	);
}
