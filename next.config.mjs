/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.TAY_DESKTOP_BRIDGE_URL ? ".next-desktop" : ".next",
  env: { NEXT_PUBLIC_TAY_BUILD_SHA: process.env.COMMIT_REF || process.env.TAY_BUILD_SHA || "unversioned-local" },
  ...(process.env.NEXT_OUTPUT === "export"
    ? {
        output: "export",
        images: {
          unoptimized: true,
        },
      }
    : {}),
};

export default nextConfig;
