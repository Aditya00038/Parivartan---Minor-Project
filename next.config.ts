import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // Disable React Strict Mode — it double-invokes effects which causes
  // Firebase SDK watch-stream listeners to deregister at -1 (known SDK bug).
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // @opentelemetry/exporter-jaeger is an optional peer dep of
  // @opentelemetry/sdk-node (used by @genkit-ai/core) that is never installed.
  // Tell webpack to stub it out so the build doesn't fail.
  webpack: (config) => {
    config.resolve.alias['@opentelemetry/exporter-jaeger'] = false;
    return config;
  },
  // Disable service worker
  headers: async () => [
    {
      source: '/sw.js',
      headers: [
        {
          key: 'Cache-Control',
          value: 'no-store',
        },
      ],
    },
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'encrypted-tbn0.gstatic.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
