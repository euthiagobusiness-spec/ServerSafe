import Image from "next/image";
import Link from "next/link";
import { BriefcaseBusiness, Cloud, Mail, Phone, Search, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { site } from "@/config/site";
import { vmwareHypervLanding } from "@/config/vmware-hyperv";

export function VmwareHypervHeader() {
  return (
    <>
      <header className="site-header fixed inset-x-0 top-0 z-50 border-b border-slate-100 bg-white/95 shadow-[0_8px_26px_rgba(15,23,42,0.05)] backdrop-blur-md">
        <div className="site-header-inner mx-auto flex max-w-7xl items-center justify-between gap-5 px-4 py-3 sm:px-6 lg:px-8">
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
              className="site-header-logo h-11 w-auto sm:h-14"
            />
          </Link>

          <div className="flex min-w-0 flex-1 flex-col items-end gap-3">
            <div className="hidden items-center gap-4 text-xs font-bold text-slate-700 lg:flex">
              <span className="inline-flex items-center gap-2">
                <Cloud className="h-4 w-4 text-blue-700" aria-hidden="true" />
                Infraestrutura critica
              </span>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-cyan-700" aria-hidden="true" />
                Backup e seguranca
              </span>
              <a
                href={site.contact.emailHref}
                className="inline-flex items-center gap-2 transition hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
              >
                <Mail className="h-4 w-4 text-cyan-700" aria-hidden="true" />
                {site.contact.email}
              </a>
              <BriefcaseBusiness className="h-4 w-4 text-blue-700" aria-hidden="true" />
              <a
                href={site.contact.supportHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 transition hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
              >
                <Phone className="h-4 w-4 text-blue-700" aria-hidden="true" />
                {site.contact.phone}
              </a>
            </div>

            <div className="flex items-center gap-5">
              <Search className="hidden h-5 w-5 text-blue-700 lg:block" aria-hidden="true" />
              <nav className="site-header-nav hidden items-center gap-7 lg:flex" aria-label="Navegacao da landing page">
                {vmwareHypervLanding.nav.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="text-sm font-bold text-slate-950 transition hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
              <Button
                href="#contato"
                variant="tech"
                className="site-header-cta min-h-10 px-4 py-2 text-[0.7rem] sm:text-xs"
              >
                {vmwareHypervLanding.ctas.header}
              </Button>
            </div>
          </div>
        </div>
      </header>
      <div className="site-header-spacer" aria-hidden="true" />
    </>
  );
}
