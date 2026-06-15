import Image from "next/image";

import { Button } from "@/components/ui/Button";
import { navigationLinks } from "@/config/links";
import { site } from "@/config/site";

export function Header() {
  return (
    <>
      <header className="site-header fixed inset-x-0 top-0 z-50 border-b border-white/60 bg-white/72 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-md">
        <div className="site-header-inner mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
          <a
            href="#top"
            className="group flex items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
            aria-label="ServerSafe - inicio"
          >
            <Image
              src="/assets/brand/server-safe-lockup-clean.png"
              alt={site.name}
              width={346}
              height={122}
              priority
              className="site-header-logo h-9 w-auto sm:h-11"
            />
          </a>

          <nav className="site-header-nav hidden items-center gap-7 lg:flex" aria-label="Navegacao principal">
            {navigationLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-xs font-semibold uppercase tracking-[0.10em] text-slate-600 transition hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <Button
            href={site.contact.supportHref}
            target="_blank"
            variant="tech"
            className="site-header-cta min-h-9 px-3 py-2 text-[0.65rem] sm:min-h-10 sm:px-4 sm:text-xs"
          >
            {site.diagnosticCta}
          </Button>
        </div>
      </header>
      <div className="site-header-spacer" aria-hidden="true" />
    </>
  );
}
