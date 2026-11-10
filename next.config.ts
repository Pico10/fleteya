import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['firebase', '@firebase/firestore', '@firebase/app'],
};

export default nextConfig;