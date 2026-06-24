import { HelpCircle } from "lucide-react";

import { GlassCard } from "@/components/ui/GlassCard";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { SectionShell } from "@/components/ui/SectionShell";
import { vmwareHypervLanding } from "@/config/vmware-hyperv";

export function Faq() {
  const { faq } = vmwareHypervLanding;

  return (
    <SectionShell id="faq" className="bg-[#f4f8fb]" tone="transparent" topLine>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <SectionIntro badge={faq.badge} title={faq.title} className="max-w-3xl" />

          <div className="grid gap-3">
            {faq.items.map((item) => (
              <GlassCard key={item.question} as="details" className="group bg-white px-4 py-4 sm:px-5">
                <summary className="flex cursor-pointer list-none items-start gap-3 text-left text-base font-black text-slate-950 marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
                  <HelpCircle className="mt-1 h-5 w-5 shrink-0 text-cyan-700" aria-hidden="true" />
                  <span>{item.question}</span>
                </summary>
                <p className="mt-4 border-t border-slate-200 pt-4 text-sm leading-7 text-slate-600">
                  {item.answer}
                </p>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
