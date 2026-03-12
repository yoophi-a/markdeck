import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typedRoutes: false,
  outputFileTracingRoot: path.resolve(process.cwd()),
};

export default nextConfig;
