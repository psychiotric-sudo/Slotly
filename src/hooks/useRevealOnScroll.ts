import { useEffect } from "react";

/**
 * Reveal-once scroll animation for the landing page.
 *
 * Observes every `[data-reveal]` element and adds `.is-visible` the first
 * time it enters the viewport. Uses IntersectionObserver (never a scroll
 * listener), reveals once, and has no parallax. When the visitor prefers
 * reduced motion — or IntersectionObserver is unavailable — everything is
 * revealed immediately.
 */
export function useRevealOnScroll() {
  useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]")
    );
    if (nodes.length === 0) return;

    const reveal = (node: HTMLElement) => node.classList.add("is-visible");

    const prefersReduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced || !("IntersectionObserver" in window)) {
      nodes.forEach(reveal);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          reveal(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.15 }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);
}
