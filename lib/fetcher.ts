'use server';

import z4 from 'zod/v4';

// using localhost for build time
const BACKEND_URL =
	process.env.IDX_STOCK_SCREENER_INTERNAL ??
	'http://localhost:8080/stocks-screener';

if (!BACKEND_URL) {
	throw new Error('Backend variable is not set');
}

if (!BACKEND_URL && process.env.NODE_ENV === 'production') {
	throw new Error('env is required in production');
}

type HttpMethod = 'GET' | 'POST';

type CacheMode =
	| 'default'
	| 'no-store'
	| 'no-cache'
	| 'reload'
	| 'force-cache'
	| 'only-if-cached';

type FetchOptions<T> = Omit<RequestInit, 'method'> & {
	method?: HttpMethod;
	tags?: string[];
	/** Only honoured when `cache` allows caching; see the note in `fetcher`. */
	revalidate?: number | false;
	cache?: CacheMode;
	responseType?: 'JSON' | 'TEXT';
	schema?: z4.ZodType<T>;
	baseUrl?: string;
};

export const fetcher = async <T>(
	endpoint: string,
	options: FetchOptions<T> = {}
) => {
	const {
		method = 'GET',
		tags = [],
		revalidate,
		cache = 'no-store',
		baseUrl,
		...fetchOptions
	} = options;

	const effectiveBaseUrl = baseUrl || BACKEND_URL;
	if (!effectiveBaseUrl) {
		throw new Error('No base URL provided');
	}

	const base = effectiveBaseUrl.endsWith('/')
		? effectiveBaseUrl
		: effectiveBaseUrl + '/';
	const path = endpoint.startsWith('/')
		? endpoint.slice(1)
		: endpoint;
	const url = new URL(path, base);

	// `cache: no-store`/`no-cache` and `next.revalidate` are mutually exclusive:
	// Next warns when both are set, and `revalidate: false` means "cache
	// forever", the opposite of the uncached default. So `next` only goes out
	// when the caller actually opted into caching.
	const uncached = cache === 'no-store' || cache === 'no-cache';

	const response = await fetch(url, {
		method,
		...fetchOptions,
		headers: {
			'Content-Type': 'application/json',
			...fetchOptions.headers,
		},
		cache,
		...(uncached
			? {}
			: {
					next: {
						...(tags.length > 0 && { tags }),
						...(revalidate !== undefined && { revalidate }),
					},
			  }),
	});

	if (!response.ok) {
		const text = await response.text().catch(() => '');
		throw new Error(
			`API fetch failed [${response.status}]: ${
				response.statusText
			}${text ? ` - ${text}` : ''}`
		);
	}

	let data: any;
	if (options.responseType === 'TEXT') {
		data = await response.text();
	} else {
		data = await response.json();
	}

	if (options.schema && data) {
		return options.schema.parse(data);
	}
	return data as T;
};
