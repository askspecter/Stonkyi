import { Hero } from "@/components/Hero";
import { Steps } from "@/components/Steps";
import { DeskTerminal } from "@/components/DeskTerminal";
import { Flywheel } from "@/components/Flywheel";
import { Numbers } from "@/components/Numbers";
import { CloseCTA } from "@/components/CloseCTA";
import { MarketProvider, StockTicker, PairedStock } from "@/components/Market";

export default function HomePage() {
  return (
    <MarketProvider>
      <Hero />
      <StockTicker />
      <Steps />
      <DeskTerminal />
      <Flywheel />
      <PairedStock />
      <Numbers />
      <CloseCTA />
    </MarketProvider>
  );
}
