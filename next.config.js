/** @type {import('next').NextConfig} */

// Next.js configuration for the NextGem Volunteer Platform
// We keep this minimal - no special config needed for Vercel deployment.
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Allow images from Supabase storage and common CDNs
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
};

module.exports = nextConfig;
