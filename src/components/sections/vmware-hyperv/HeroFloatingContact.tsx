import { MessageCircle } from "lucide-react";

import { site } from "@/config/site";

export function HeroFloatingContact() {
  return (
    <a
      href={site.contact.supportHref}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-white shadow-[0_12px_28px_rgba(16,185,129,0.35)] transition hover:bg-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600"
      aria-label="Falar com a ServerSafe pelo WhatsApp"
    >
      <MessageCircle className="h-7 w-7" aria-hidden="true" />
    </a>
  );
}
