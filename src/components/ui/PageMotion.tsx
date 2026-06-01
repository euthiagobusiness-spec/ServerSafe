"use client";

import { useEffect } from "react";

const revealSelector = ".fade-stage, .reveal-surface";

export function PageMotion() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    document.documentElement.classList.add("motion-ready");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const target = entry.target as HTMLElement;
          target.classList.toggle("is-visible", entry.isIntersecting);
          target.dataset.visible = entry.isIntersecting ? "true" : "false";
        }
      },
      {
        root: null,
        rootMargin: prefersReducedMotion ? "-4% 0px -6% 0px" : "-8% 0px -10% 0px",
        threshold: prefersReducedMotion ? 0.08 : 0.16,
      },
    );

    Array.from(document.querySelectorAll<HTMLElement>(revealSelector)).forEach((element, index) => {
      element.style.setProperty("--fade-delay", `${Math.min(index % 4, 3) * 38}ms`);
      element.style.setProperty("--reveal-delay", `${Math.min(index % 4, 3) * 42}ms`);
      observer.observe(element);
    });

    const onAnchorClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href^='#']");
      if (!link) return;

      const hash = link.getAttribute("href");
      if (!hash || hash === "#") return;

      const target = document.querySelector<HTMLElement>(hash);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
      window.history.pushState(null, "", hash);

      window.setTimeout(
        () => {
          target.setAttribute("tabindex", "-1");
          target.focus({ preventScroll: true });
        },
        prefersReducedMotion ? 0 : 360,
      );
    };

    document.addEventListener("click", onAnchorClick);

    return () => {
      observer.disconnect();
      document.documentElement.classList.remove("motion-ready");
      document.removeEventListener("click", onAnchorClick);
    };
  }, []);

  return null;
}
