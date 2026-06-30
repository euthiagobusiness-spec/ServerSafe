import { CheckCircle2 } from "lucide-react";

import { vmwareHypervLanding } from "@/config/vmware-hyperv";

export function HeroRecognition() {
  const { recognition } = vmwareHypervLanding;

  return (
    <div className="border-y border-slate-100 bg-[#f8fafc]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-center text-lg font-bold text-slate-700 sm:text-xl">{recognition.title}</p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {recognition.items.map((item) => (
            <div key={item} className="flex min-h-16 items-center justify-center gap-2 border border-slate-200 bg-white px-3 py-3 text-center text-sm font-bold text-slate-700">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
