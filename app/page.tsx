import { Hero } from "@/components/Hero";
import { Steps } from "@/components/Steps";
import { Collection } from "@/components/Collection";
import { Numbers } from "@/components/Numbers";
import { CloseCTA } from "@/components/CloseCTA";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Steps />
      <Collection />
      <Numbers />
      <CloseCTA />
    </>
  );
}
