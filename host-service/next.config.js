/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  webpack: (config) => {
    // Handle .node files for native modules
    config.resolve.extensions.push('.node');

    return config;
  },
};

module.exports = nextConfig;
