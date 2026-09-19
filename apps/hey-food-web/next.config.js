/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@hey-food/design-tokens", "@hey-food/shared-types", "@hey-food/api-client"],
};

module.exports = nextConfig;
