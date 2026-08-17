import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/m71breje/image/upload/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/v0/b/club-basa-acapulco.firebasestorage.app/o/**',
      },
      {
        protocol: 'https',
        hostname: 'club-basa-acapulco.firebasestorage.app',
        pathname: '/**',
      },
    ],
  },
  compress: true,
  experimental: { optimizePackageImports: ['firebase'] },
};

export default nextConfig;
