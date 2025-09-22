/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable the trailing-slash gotchas for our legacy paths
  trailingSlash: false,

  async rewrites() {
    // IMPORTANT: set API_ORIGIN in Vercel env to your Render URL
    const API_ORIGIN = process.env.API_ORIGIN;
    if (!API_ORIGIN) {
      // Fail closed so you notice it at build-time
      console.warn('⚠️ API_ORIGIN is not set; /api/* will 404 on Vercel');
      return [];
    }
    return [
      {
        source: '/api/:path*',
        destination: `${API_ORIGIN}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
