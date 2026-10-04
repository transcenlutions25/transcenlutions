/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    outputFileTracingIncludes: {
      "/api/apex/checklist": ["./products/funnel-checklist/funnel-leak-emergency-checklist.html"],
    },
  },
  ...(process.env.NEXT_OUTPUT === "export"
    ? {
        output: "export",
        images: { unoptimized: true },
      }
    : {}),
};
export default nextConfig;
