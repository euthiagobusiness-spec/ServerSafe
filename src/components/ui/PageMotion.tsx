"use client";

import { useEffect } from "react";

const revealSelector = ".fade-stage, .reveal-surface";

export function PageMotion() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let headerFrame = 0;
    let lastHeaderScrollY = window.scrollY;

    document.documentElement.classList.add("motion-ready");

    const updateHeaderState = () => {
      headerFrame = 0;
      lastHeaderScrollY = window.scrollY;
      document.documentElement.classList.toggle("header-compact", window.scrollY > 24);
    };

    const onScroll = () => {
      if (headerFrame) {
        return;
      }

      headerFrame = window.requestAnimationFrame(updateHeaderState);
    };

    const headerFallback = window.setInterval(() => {
      if (window.scrollY !== lastHeaderScrollY) {
        onScroll();
      }
    }, 120);

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
    updateHeaderState();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      if (headerFrame) {
        window.cancelAnimationFrame(headerFrame);
      }

      observer.disconnect();
      window.clearInterval(headerFallback);
      document.documentElement.classList.remove("motion-ready");
      document.documentElement.classList.remove("header-compact");
      document.removeEventListener("click", onAnchorClick);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return null;
}
