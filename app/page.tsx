import { Hero } from "@/components/Hero";
import { Steps } from "@/components/Steps";
import { DeskTerminal } from "@/components/DeskTerminal";
import { Flywheel } from "@/components/Flywheel";
import { Collection } from "@/components/Collection";
import { Numbers } from "@/components/Numbers";
import { CloseCTA } from "@/components/CloseCTA";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Steps />
      <DeskTerminal />
      <Flywheel />
      <Collection />
      <Numbers />
      <CloseCTA />
    </>
  );
}
