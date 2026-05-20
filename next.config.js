/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'mgx-backend-cdn.metadl.com' },
      { protocol: 'https', hostname: 'sntcxllhlwnxxbrzcuxb.supabase.co' },
    ],
  },
};

module.exports = nextConfig;
