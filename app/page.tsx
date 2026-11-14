import { Agents } from "@/components/sections/Agents";
import { Busywork } from "@/components/sections/Busywork";
import { Calculator } from "@/components/sections/Calculator";
import { Cta } from "@/components/sections/Cta";
import { Faq } from "@/components/sections/Faq";
import { FieldReports } from "@/components/sections/FieldReports";
import { Hero } from "@/components/sections/Hero";
import { Process } from "@/components/sections/Process";

/** Home route = content only. Canvas, HUD, cursor, loader live in the persistent Shell (app/layout.tsx). */
export default function Home() {
  return (
    <main>
      <Hero />
      <Busywork />
      <Agents />
      <Process />
      <Calculator />
      <FieldReports />
      <Faq />
      <Cta />
    </main>
  );
}
