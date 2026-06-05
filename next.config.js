/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Cloudflare R2 custom domain
      {
        protocol: "https",
        hostname:
          process.env.R2_PUBLIC_URL?.replace(/^https?:\/\//, "").replace(
            /\/$/,
            "",
          ) || "**.r2.dev",
        pathname: "/**",
      },
      // Any HTTPS source (fallback for R2 public URLs)
      {
        protocol: "https",
        hostname: "**",
      },
      // Local development
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/**",
      },
    ],
    // Use Vercel Image Optimization
    unoptimized: false,
  },
  // Increase body size limit for uploads (when not using presigned URLs)
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

module.exports = nextConfig;
