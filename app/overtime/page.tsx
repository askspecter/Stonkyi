import { Overtime } from "@/components/Overtime";

export default function OvertimePage() {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-28">
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
        Clock <span className="acid-text">In</span>
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-acidDim">
        Put your brokers on the clock to earn a share of every tokenized-stock distribution — from
        new mints and, soon, from Anvil trading fees. Each clocked-in broker is one share; rewards
        accrue pro-rata and are yours to claim anytime. Clock out to take your broker back.
      </p>
      <div className="mt-8">
        <Overtime />
      </div>
    </div>
  );
}
