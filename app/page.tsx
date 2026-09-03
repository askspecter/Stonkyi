import { Hero } from "@/components/Hero";
import { DeskSim } from "@/components/DeskSim";
import { Flywheel } from "@/components/Flywheel";
import { StatsBand } from "@/components/StatsBand";
import { TradingFloor } from "@/components/TradingFloor";
import { EnterCTA } from "@/components/EnterCTA";

export default function HomePage() {
  return (
    <>
      <Hero />
      <DeskSim />
      <Flywheel />
      <StatsBand />
      <TradingFloor />
      <EnterCTA />
    </>
  );
}
