/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure the token-metadata JSON files ship with the serverless function that
  // reads them (the /nft/metadata/[id] route), so they resolve on Vercel.
  experimental: {
    outputFileTracingIncludes: {
      "/nft/metadata/[id]": ["./data/nft-metadata/**"],
    },
  },
  webpack: (config, { webpack }) => {
    // The Base Account connector (pulled in via RainbowKit → wagmi) references
    // optional x402-payment packages we never use. Ignore them so the bundle
    // resolves cleanly.
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp:
          /^@x402\/|^@react-native-async-storage\/async-storage$/,
      })
    );
    // Optional pretty-printers / native deps used by WalletConnect logging.
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
};

export default nextConfig;
