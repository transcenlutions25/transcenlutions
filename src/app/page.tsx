import { SiteHeader } from "@/components/SiteHeader";
import { Hero } from "@/components/Hero";
import { MoneyOS } from "@/components/MoneyOS";
import { CreatorHub } from "@/components/CreatorHub";
import { BusinessWorkspace } from "@/components/BusinessWorkspace";
import { Connectors } from "@/components/Connectors";
import { Insights } from "@/components/Insights";
import { Copilot } from "@/components/Copilot";
import { Pricing } from "@/components/Pricing";
import { Roadmap } from "@/components/Roadmap";
import { SiteFooter } from "@/components/SiteFooter";

export default function Page() {
  return (
    <main>
      <SiteHeader />
      <Hero />
      <MoneyOS />
      <CreatorHub />
      <BusinessWorkspace />
      <Connectors />
      <Insights />
      <Copilot />
      <Pricing />
      <Roadmap />
      <SiteFooter />
    </main>
  );
}
