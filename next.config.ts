import type {NextConfig} from 'next';
const nextConfig:NextConfig={images:{formats:['image/avif','image/webp'],minimumCacheTTL:86400,remotePatterns:[{protocol:'https',hostname:'res.cloudinary.com',pathname:'/m71breje/image/upload/**'}]},compress:true,experimental:{optimizePackageImports:['firebase']}};
export default nextConfig;
