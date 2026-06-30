import { ArrowRight, Phone } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { site } from "@/config/site";
import { vmwareHypervLanding } from "@/config/vmware-hyperv";

export function FinalCtaActions() {
  const { ctas } = vmwareHypervLanding;

  return (
    <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
      <Button href="#contato" variant="secondary" className="border-white bg-white text-blue-800 hover:bg-blue-50">
        {ctas.final}
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
      </Button>
      <a
        href={site.contact.supportHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[8px] border border-blue-200 bg-blue-600 px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white shadow-[0_12px_28px_rgba(15,23,42,0.12)] transition duration-300 hover:border-white/60 hover:bg-blue-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-100"
      >
        <Phone className="h-4 w-4" aria-hidden="true" />
        Falar agora
      </a>
    </div>
  );
}
