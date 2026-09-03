import { BrokerDesk } from "@/components/BrokerDesk";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-28">
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
        Broker <span className="acid-text">Desk</span>
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-acidDim">
        Your brokers, their ERC-6551 wallets, and the tokenized stock they&apos;ve
        earned. Clock in, claim your overtime.
      </p>
      <div className="mt-8">
        <BrokerDesk />
      </div>
    </div>
  );
}
