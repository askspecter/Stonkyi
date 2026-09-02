import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Features } from "@/components/Features";
import { BrokerGallery } from "@/components/BrokerGallery";

export default function HomePage() {
  return (
    <div>
      <Hero />
      <BrokerGallery />
      <HowItWorks />
      <Features />
    </div>
  );
}
