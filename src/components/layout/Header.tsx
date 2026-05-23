import Image from "next/image";

import { navigationLinks } from "@/config/links";
import { site } from "@/config/site";
import { Button } from "@/components/ui/Button";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/60 bg-white/62 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a
          href="#top"
          className="group flex items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
          aria-label="ServerSafe - inicio"
        >
          <Image
            src="/assets/brand/server-safe-wordmark-cropped.png"
            alt={site.name}
            width={1683}
            height={387}
            priority
            className="h-10 w-auto sm:h-11"
          />
        </a>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Navegação principal">
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

        <Button href="#diagnostico" variant="tech" className="hidden min-h-10 px-4 py-2 text-xs sm:inline-flex">
          {site.diagnosticCta}
        </Button>
      </div>
    </header>
  );
}
