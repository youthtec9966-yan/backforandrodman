/** @type {import('next').NextConfig} */
const nextConfig = {
	allowedDevOrigins: ["dev.imtim.cn:3001"],
  serverExternalPackages: ["better-sqlite3"],
  devIndicators: false,
};

export default nextConfig;
