import type { NextConfig } from 'next';
import { version } from './package.json';

const nextConfig: NextConfig = {
	// baked in at build time, so the running site shows which release it is
	env: {
		NEXT_PUBLIC_APP_VERSION: version,
	},
};

export default nextConfig;
