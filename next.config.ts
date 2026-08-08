import type {NextConfig} from 'next';
const nextConfig:NextConfig={images:{formats:['image/avif','image/webp'],minimumCacheTTL:86400},compress:true,experimental:{optimizePackageImports:['firebase']}};
export default nextConfig;