import type { Metadata } from "next";

import { Footer } from "@/components/layout/Footer";
import { Expertise } from "@/components/sections/vmware-hyperv/Expertise";
import { Faq } from "@/components/sections/vmware-hyperv/Faq";
import { FinalCta } from "@/components/sections/vmware-hyperv/FinalCta";
import { VmwareHypervHeader } from "@/components/sections/vmware-hyperv/Header";
import { Hero } from "@/components/sections/vmware-hyperv/Hero";
import { LeadForm } from "@/components/sections/vmware-hyperv/LeadForm";
import { Process } from "@/components/sections/vmware-hyperv/Process";
import { Solution } from "@/components/sections/vmware-hyperv/Solution";
import { PageMotion } from "@/components/ui/PageMotion";

export const metadata: Metadata = {
  title: "Migracao VMware para Hyper-V | ServerSafe",
  description:
    "Migracao de ambientes VMware para Hyper-V com diagnostico, planejamento, backup, rollback, validacao tecnica e continuidade operacional.",
  keywords: [
    "migracao VMware para Hyper-V",
    "migracao de servidores virtuais",
    "virtualizacao",
    "infraestrutura de servidores",
    "Hyper-V",
    "VMware",
    "continuidade operacional",
    "backup",
    "infraestrutura empresarial",
    "ServerSafe",
  ],
  openGraph: {
    title: "Migracao VMware para Hyper-V | ServerSafe",
    description:
      "Diagnostico, planejamento, backup, rollback e validacao tecnica para migrar ambientes VMware para Hyper-V com mais previsibilidade.",
    type: "website",
    locale: "pt_BR",
  },
};

export default function VmwareHypervMigrationPage() {
  return (
    <div className="ambient-stage relative min-h-screen overflow-hidden bg-[#f4f8fb] text-slate-950">
      <PageMotion />
      <VmwareHypervHeader />
      <main className="content-layer">
        <div className="motion-section fade-stage is-visible">
          <Hero />
        </div>
        <div className="relative z-10">
          <div className="motion-section fade-stage">
            <Expertise />
          </div>
          <div className="motion-section fade-stage">
            <Solution />
          </div>
          <div className="motion-section fade-stage">
            <Process />
          </div>
          <div className="motion-section fade-stage">
            <LeadForm />
          </div>
          <div className="motion-section fade-stage">
            <Faq />
          </div>
          <div className="motion-section fade-stage">
            <FinalCta />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
