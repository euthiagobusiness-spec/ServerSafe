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
import { PageMotion } from "@/components/ui/PageMotion";

export default function Home() {
  return (
    <div className="ambient-stage relative min-h-screen overflow-hidden bg-[#edf4fb] text-slate-950">
      <PageMotion />
      <Header />
      <main className="content-layer">
        <div className="motion-section fade-stage is-visible">
          <Hero />
        </div>
        <div className="post-hero-wallpaper">
          <div className="site-background" aria-hidden="true" />
          <div className="wallpaper-fade" aria-hidden="true" />
          <div className="relative z-10">
            <div className="motion-section fade-stage">
              <CriticalProblems />
            </div>
            <div className="motion-section fade-stage">
              <Solutions />
            </div>
            <div className="motion-section fade-stage">
              <Continuity />
            </div>
            <div className="motion-section fade-stage">
              <Industries />
            </div>
            <div className="motion-section fade-stage">
              <AboutNeto />
            </div>
            <div className="motion-section fade-stage">
              <Governance />
            </div>
            <div className="motion-section fade-stage">
              <Process />
            </div>
            <div className="motion-section fade-stage">
              <FinalCTA />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
