import { MintCard } from "@/components/MintCard";

export default function MintPage() {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-5 pb-24 pt-28 md:grid-cols-2 md:items-start">
      <div>
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
          Mint <span className="acid-text">StonkInu</span>
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-acidDim">
          Hiring a broker burns 50,000 $STONKINU and charges a 0.002 ETH desk
          fee. Half the fee is instantly swapped into tokenized stock and shared
          with existing holders; half funds the protocol. Your broker mints with
          its own ERC-6551 wallet.
        </p>

        <ul className="mt-6 space-y-2 text-sm text-acidDim">
          <li>▸ Fixed supply: <span className="text-acid">999 brokers</span>, ever.</li>
          <li>▸ Deflationary: every mint burns $STONKINU for good.</li>
          <li>▸ Passive stock rewards accrue to every broker you hold.</li>
          <li>▸ Rewards follow the NFT — sell the broker, sell the yield.</li>
        </ul>

        <p className="mt-6 rounded-md border border-line bg-ink/50 p-4 text-xs leading-relaxed text-acidDim">
          <span className="text-gold">Two steps:</span> first approve the broker
          to burn your $STONKINU, then mint. You keep custody the whole time —
          the contract only pulls the exact 50,000 it burns.
        </p>
      </div>

      <MintCard />
    </div>
  );
}
