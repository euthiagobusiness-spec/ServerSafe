import { vmwareHypervLanding } from "@/config/vmware-hyperv";
import { FinalCtaActions } from "./FinalCtaActions";

export function FinalCta() {
  const { finalCta } = vmwareHypervLanding;

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

        <FinalCtaActions />
      </div>
    </section>
  );
}
