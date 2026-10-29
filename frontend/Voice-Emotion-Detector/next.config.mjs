/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produces a small self-contained server for the Docker image
  output: "standalone",
};

export default nextConfig;
