/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true, // Next.js export requires unoptimized images for static HTML
  },
};

module.exports = nextConfig;
