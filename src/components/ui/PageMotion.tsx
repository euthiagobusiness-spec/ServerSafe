"use client";

import { useEffect, useRef } from "react";

const OBSERVED_SELECTOR = ".fade-stage, .reveal-surface";

function canAnimate() {
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isDesktopMotion() {
  return canAnimate() && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export function PageMotion() {
  const timeoutRef = useRef<number | null>(null);
  const pointerFrameRef = useRef<number | null>(null);
  const ambientPrimaryRef = useRef<HTMLDivElement>(null);
  const ambientSecondaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.add("motion-ready");

    if (!canAnimate()) {
      document.querySelectorAll(OBSERVED_SELECTOR).forEach((element) => {
        element.classList.add("is-visible");
      });
      return undefined;
    }

    const observed = document.querySelectorAll<HTMLElement>(OBSERVED_SELECTOR);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const element = entry.target as HTMLElement;
          element.classList.toggle("is-visible", entry.isIntersecting);
          element.dataset.visible = String(entry.isIntersecting);
        });
      },
      {
        rootMargin: "0px 0px -10% 0px",
        threshold: [0.08, 0.18],
      },
    );

    observed.forEach((element, index) => {
      element.style.setProperty("--fade-delay", `${Math.min(index % 6, 5) * 55}ms`);
      element.style.setProperty("--reveal-delay", `${Math.min(index % 6, 5) * 45}ms`);
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
      document.documentElement.classList.remove("motion-ready");
    };
  }, []);

  useEffect(() => {
    if (!isDesktopMotion()) return undefined;

    const handlePointerMove = (event: PointerEvent) => {
      if (pointerFrameRef.current) return;

      const x = event.clientX;
      const y = event.clientY;
      pointerFrameRef.current = window.requestAnimationFrame(() => {
        const primaryX = x;
        const primaryY = y;
        const secondaryX = x + window.innerWidth * 0.18;
        const secondaryY = y + window.innerHeight * 0.22;

        if (ambientPrimaryRef.current) {
          ambientPrimaryRef.current.style.transform = `translate3d(${primaryX}px, ${primaryY}px, 0) translate3d(-50%, -50%, 0)`;
        }

        if (ambientSecondaryRef.current) {
          ambientSecondaryRef.current.style.transform = `translate3d(${secondaryX}px, ${secondaryY}px, 0) translate3d(-50%, -50%, 0)`;
        }

        pointerFrameRef.current = null;
      });
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      if (pointerFrameRef.current) window.cancelAnimationFrame(pointerFrameRef.current);
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

  return (
    <>
      <div ref={ambientPrimaryRef} className="ambient-orb ambient-orb-primary" aria-hidden="true" />
      <div ref={ambientSecondaryRef} className="ambient-orb ambient-orb-secondary" aria-hidden="true" />
      <div className="page-transition-overlay" aria-hidden="true" />
    </>
  );
}
