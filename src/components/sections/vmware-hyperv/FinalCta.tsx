import { ArrowRight, Phone } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { site } from "@/config/site";
import { vmwareHypervLanding } from "@/config/vmware-hyperv";

export function FinalCta() {
  const { ctas, finalCta } = vmwareHypervLanding;

  return (
    <section className="relative overflow-hidden bg-blue-700 px-4 py-14 text-white sm:px-6 sm:py-20 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(103,232,249,0.22),transparent_34%)]" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <h2 className="max-w-3xl text-balance text-[2rem] font-black leading-tight sm:text-5xl">
            {finalCta.title}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-blue-50 sm:text-lg sm:leading-8">
            {finalCta.description}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <Button href="#contato" variant="secondary" className="border-white bg-white text-blue-800 hover:bg-blue-50">
            {ctas.final}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
          </Button>
          <Button href={site.contact.supportHref} target="_blank" variant="outline" className="border-blue-200 bg-blue-600 text-white hover:bg-blue-800 hover:text-white">
            <Phone className="h-4 w-4" aria-hidden="true" />
            Falar agora
          </Button>
        </div>
      </div>
    </section>
  );
}
