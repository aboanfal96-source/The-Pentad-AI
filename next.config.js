/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@anthropic-ai/sdk", "openai", "pdfkit", "mammoth", "pdf-parse"],
};
module.exports = nextConfig;
