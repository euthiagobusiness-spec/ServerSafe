"use client";

import { useEffect, useRef } from "react";

const OBSERVED_SELECTOR = ".motion-section, .motion-card";

function canAnimate() {
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isDesktopMotion() {
  return canAnimate() && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export function PageMotion() {
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("motion-ready");

    if (!canAnimate()) {
      document.querySelectorAll(OBSERVED_SELECTOR).forEach((element) => {
        element.classList.add("is-visible");
      });
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.08,
      },
    );

    document.querySelectorAll(OBSERVED_SELECTOR).forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
      document.documentElement.classList.remove("motion-ready");
    };
  }, []);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href^='#']");
      if (!link) return;

      const hash = link.getAttribute("href");
      if (!hash || hash === "#") return;

      const target = document.querySelector<HTMLElement>(hash);
      if (!target) return;

      event.preventDefault();

      const animate = isDesktopMotion();
      if (animate) {
        document.documentElement.style.setProperty("--cursor-x", `${event.clientX}px`);
        document.documentElement.style.setProperty("--cursor-y", `${event.clientY}px`);
      }

      const scrollTarget = () => {
        target.scrollIntoView({ behavior: animate ? "smooth" : "auto", block: "start" });
        window.history.pushState(null, "", hash);

        window.setTimeout(() => {
          target.setAttribute("tabindex", "-1");
          target.focus({ preventScroll: true });
        }, animate ? 420 : 0);
      };

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      if (animate) {
        document.documentElement.classList.add("is-page-transitioning");
        timeoutRef.current = window.setTimeout(() => {
          document.documentElement.classList.remove("is-page-transitioning");
        }, 760);
      }

      if (animate && "startViewTransition" in document) {
        const documentWithTransition = document as Document & {
          startViewTransition: (callback: () => void) => { finished: Promise<void> };
        };

        documentWithTransition.startViewTransition(scrollTarget).finished.finally(() => {
          document.documentElement.classList.remove("is-page-transitioning");
        });
        return;
      }

      scrollTarget();
    };

    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  return <div className="page-transition-overlay" aria-hidden="true" />;
}
