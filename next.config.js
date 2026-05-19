/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@anthropic-ai/sdk", "openai", "pdfkit", "mammoth"],
  },
};
module.exports = nextConfig;
