/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/models',
        destination: '/aidean',
        permanent: true,
      },
      {
        source: '/resources',
        destination: '/space',
        permanent: true,
      },
      {
        source: '/products',
        destination: '/sphere',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/aidean/:path*',
        destination: '/models/:path*',
      },
      {
        source: '/space/:path*',
        destination: '/resources/:path*',
      },
      {
        source: '/sphere/:path*',
        destination: '/products/:path*',
      },
    ];
  },
};

export default nextConfig;

