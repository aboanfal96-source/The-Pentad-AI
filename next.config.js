/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@anthropic-ai/sdk", "openai", "pdfkit"],
  },
  api: {
    bodyParser: {
      sizeLimit: "20mb",
    },
  },
};
module.exports = nextConfig;
