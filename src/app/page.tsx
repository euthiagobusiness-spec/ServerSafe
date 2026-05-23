import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { AboutNeto } from "@/components/sections/AboutNeto";
import { Continuity } from "@/components/sections/Continuity";
import { CriticalProblems } from "@/components/sections/CriticalProblems";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { Governance } from "@/components/sections/Governance";
import { Hero } from "@/components/sections/Hero";
import { Industries } from "@/components/sections/Industries";
import { Process } from "@/components/sections/Process";
import { Solutions } from "@/components/sections/Solutions";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#edf4fb] text-slate-950">
      <div className="site-background" aria-hidden="true" />
      <Header />
      <main className="content-layer">
        <Hero />
        <CriticalProblems />
        <Solutions />
        <Continuity />
        <Industries />
        <AboutNeto />
        <Governance />
        <Process />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
