"use client";

import { useEffect } from "react";

const revealSelector = ".fade-stage, .reveal-surface";
const motionSurfaceSelector = ".motion-surface";
const glowSurfaceSelector = ".interactive-glow-card";

type PointerFrame = {
  pageX: number;
  pageY: number;
  clientX: number;
  clientY: number;
  surface: HTMLElement | null;
  glowSurface: HTMLElement | null;
  x: number;
  y: number;
  rotateX: number;
  rotateY: number;
};

function supportsDesktopPointer() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

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

    const canTrackPointer = supportsDesktopPointer();
    let animationFrame = 0;
    let pendingFrame: PointerFrame | null = null;

    const applyPointerFrame = () => {
      animationFrame = 0;
      if (!pendingFrame) return;

      const frame = pendingFrame;
      pendingFrame = null;

      document.documentElement.style.setProperty("--page-mx", `${frame.pageX.toFixed(2)}%`);
      document.documentElement.style.setProperty("--page-my", `${frame.pageY.toFixed(2)}%`);
      document.documentElement.style.setProperty("--cursor-x", `${frame.clientX.toFixed(1)}px`);
      document.documentElement.style.setProperty("--cursor-y", `${frame.clientY.toFixed(1)}px`);

      if (frame.surface) {
        frame.surface.style.setProperty("--x", `${frame.x.toFixed(2)}%`);
        frame.surface.style.setProperty("--y", `${frame.y.toFixed(2)}%`);
        frame.surface.style.setProperty("--rx", `${frame.rotateX.toFixed(3)}deg`);
        frame.surface.style.setProperty("--ry", `${frame.rotateY.toFixed(3)}deg`);
      }

      if (frame.glowSurface && frame.glowSurface !== frame.surface) {
        frame.glowSurface.style.setProperty("--x", `${frame.x.toFixed(2)}%`);
        frame.glowSurface.style.setProperty("--y", `${frame.y.toFixed(2)}%`);
        frame.glowSurface.style.setProperty("--rx", `${frame.rotateX.toFixed(3)}deg`);
        frame.glowSurface.style.setProperty("--ry", `${frame.rotateY.toFixed(3)}deg`);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!canTrackPointer || event.pointerType === "touch") return;

      const pageX = (event.clientX / window.innerWidth) * 100;
      const pageY = (event.clientY / window.innerHeight) * 100;
      const eventTarget = event.target as Element | null;
      const surface = eventTarget?.closest<HTMLElement>(motionSurfaceSelector) ?? null;
      const glowSurface = eventTarget?.closest<HTMLElement>(glowSurfaceSelector) ?? null;

      let x = 50;
      let y = 38;
      let rotateX = 0;
      let rotateY = 0;

      if (surface) {
        const rect = surface.getBoundingClientRect();
        x = ((event.clientX - rect.left) / rect.width) * 100;
        y = ((event.clientY - rect.top) / rect.height) * 100;
        rotateX = prefersReducedMotion ? (50 - y) * 0.01 : (50 - y) * 0.03;
        rotateY = prefersReducedMotion ? (x - 50) * 0.012 : (x - 50) * 0.04;
      }

      pendingFrame = {
        pageX,
        pageY,
        clientX: event.clientX,
        clientY: event.clientY,
        surface,
        glowSurface,
        x,
        y,
        rotateX,
        rotateY,
      };

      if (!animationFrame) {
        animationFrame = window.requestAnimationFrame(applyPointerFrame);
      }
    };

    const onPointerOut = (event: PointerEvent) => {
      const eventTarget = event.target as Element | null;
      const relatedTarget = event.relatedTarget as Element | null;
      const surface = eventTarget?.closest<HTMLElement>(motionSurfaceSelector);
      const glowSurface = eventTarget?.closest<HTMLElement>(glowSurfaceSelector);

      for (const target of [surface, glowSurface]) {
        if (!target) continue;
        if (relatedTarget && target.contains(relatedTarget)) continue;
        target.style.setProperty("--x", "50%");
        target.style.setProperty("--y", "38%");
        target.style.setProperty("--rx", "0deg");
        target.style.setProperty("--ry", "0deg");
      }
    };

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

    document.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerout", onPointerOut, { passive: true });
    document.addEventListener("click", onAnchorClick);

    return () => {
      observer.disconnect();
      document.documentElement.classList.remove("motion-ready");
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerout", onPointerOut);
      document.removeEventListener("click", onAnchorClick);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <>
      <div className="ambient-orb ambient-orb-primary" aria-hidden="true" />
      <div className="ambient-orb ambient-orb-secondary" aria-hidden="true" />
    </>
  );
}
