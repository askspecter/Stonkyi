import { SwapDesk } from "@/components/SwapDesk";

export default function SwapPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-28">
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
        Swap <span className="acid-text">Desk</span>
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-acidDim">
        Buy, sell, and snipe broker NFTs against $STONKINU through the Anvil AMM. Prices follow a
        constant-product curve — the fewer brokers left in the pool, the more each one costs. A small
        ETH fee per trade funds the protocol; trading fees seed the reward flywheel.
      </p>
      <div className="mt-8">
        <SwapDesk />
      </div>
    </div>
  );
}
