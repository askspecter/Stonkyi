import type { Metadata } from "next";
import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";
import { Providers } from "./providers";
import { Nav } from "@/components/Nav";
import { Ticker } from "@/components/Ticker";

export const metadata: Metadata = {
  title: "StonkInu — 999 Broker NFTs",
  description:
    "999 broker NFTs, each with its own ERC-6551 wallet. Burn $STONKINU, mint a broker, and earn tokenized stock on every mint — automatically.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-mono antialiased">
        <Providers>
          <Ticker />
          <Nav />
          <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6">
            {children}
          </main>
          <footer className="border-t border-line py-8 text-center text-xs text-acidDim">
            <p>
              StonkInu is an experimental, unaudited protocol. Nothing here is
              financial advice. Do your own research.
            </p>
            <p className="mt-2 opacity-60">
              $STONKINU · 999 brokers · ERC-6551 token-bound accounts
            </p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
