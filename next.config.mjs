/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Fully static export -> produces an `out/` folder of plain HTML/CSS/JS that
  // any host serves with zero config (Vercel, Netlify, Cloudflare Pages, GitHub
  // Pages, or drag-and-drop). Token metadata is served as static files under
  // public/nft/metadata/<id>.
  output: "export",
  images: { unoptimized: true },
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
