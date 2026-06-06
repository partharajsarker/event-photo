/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/**",
      },
      // Any HTTPS source (fallback)
      {
        protocol: "https",
        hostname: "**",
      },
      // Local development
      {
        protocol: "http",
        hostname: "localhost",
        port: "**",
        pathname: "/**",
      },
    ],
    // Use Vercel Image Optimization
    unoptimized: false,
  },
  // Increase body size limit for uploads
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

module.exports = nextConfig;
