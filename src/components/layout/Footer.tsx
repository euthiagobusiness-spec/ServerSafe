import Image from "next/image";

import { navigationLinks, links } from "@/config/links";
import { contactLinks, site } from "@/config/site";

export function Footer() {
  return (
    <footer className="content-layer border-t border-white/60 bg-white/70">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <Image
            src="/assets/brand/server-safe-lockup-dark-transparent.png"
            alt={site.name}
            width={1387}
            height={404}
            className="h-auto w-56"
          />
          <p className="mt-5 max-w-md text-sm leading-7 text-slate-600">
            Infraestrutura segura para empresas que dependem de tecnologia todos os dias.
            Ambientes protegidos, monitorados e preparados para crescer com controle.
          </p>
        </div>

        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-900">
            Institucional
          </h2>
          <div className="mt-4 grid gap-3">
            {navigationLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-slate-600 transition hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
              >
                {link.label}
              </a>
            ))}
            <a
              className="text-sm text-slate-600 transition hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
              href={links.about}
            >
              Sobre Neto
            </a>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-900">
            Contato
          </h2>
          <div className="mt-4 grid gap-3">
            {contactLinks.map(({ label, href, icon: Icon }) => (
              <a
                key={href}
                href={href}
                className="inline-flex items-center gap-3 text-sm text-slate-600 transition hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
              >
                <Icon className="h-4 w-4 text-blue-700" aria-hidden="true" />
                {label}
              </a>
            ))}
          </div>
        </div>

        <div id="seguranca-confidencialidade">
          <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-900">
            Segurança e confidencialidade
          </h2>
          <div className="mt-4 grid gap-3 text-sm text-slate-600">
            <a
              id="privacidade"
              href={links.privacy}
              className="transition hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
            >
              Política de Privacidade
            </a>
            <a
              id="termos"
              href={links.terms}
              className="transition hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
            >
              Termos de Uso
            </a>
            <p>
              Nenhum dado sensível deve ser enviado por canais não combinados. Diagnósticos
              técnicos são tratados com confidencialidade operacional.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
