import Image from "next/image";
import Link from "next/link";
import { Phone } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { site } from "@/config/site";
import { vmwareHypervLanding } from "@/config/vmware-hyperv";

export function VmwareHypervHeader() {
  return (
    <>
      <header className="site-header fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/92 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-md">
        <div className="site-header-inner mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
          <Link
            href="/"
            className="group flex min-w-0 items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
            aria-label="ServerSafe - pagina inicial"
          >
            <Image
              src="/assets/brand/server-safe-lockup-clean.png"
              alt={site.name}
              width={1059}
              height={325}
              priority
              className="site-header-logo h-9 w-auto sm:h-11"
            />
          </Link>

          <nav className="site-header-nav hidden items-center gap-6 lg:flex" aria-label="Navegacao da landing page">
            {vmwareHypervLanding.nav.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-xs font-semibold uppercase tracking-[0.10em] text-slate-600 transition hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={site.contact.supportHref}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden min-h-10 items-center gap-2 rounded-[8px] px-3 text-xs font-bold text-slate-600 transition hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 sm:inline-flex"
            >
              <Phone className="h-4 w-4 text-cyan-700" aria-hidden="true" />
              {site.contact.phone}
            </a>
            <Button
              href="#contato"
              variant="tech"
              className="site-header-cta min-h-9 px-3 py-2 text-[0.65rem] sm:min-h-10 sm:px-4 sm:text-xs"
            >
              {vmwareHypervLanding.ctas.header}
            </Button>
          </div>
        </div>
      </header>
      <div className="site-header-spacer" aria-hidden="true" />
    </>
  );
}
