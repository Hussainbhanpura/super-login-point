import { useEffect, useRef } from "react";

/**
 * Scroll-driven reveal animations powered by GSAP + ScrollTrigger.
 * Browser-only: gsap is imported dynamically inside the effect so SSR is safe.
 *
 * Usage: attach the returned ref to a container and add `className="reveal"`
 * to any descendant that should animate into view.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  deps: ReadonlyArray<unknown> = [],
) {
  const scope = useRef<T | null>(null);

  useEffect(() => {
    const root = scope.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.querySelectorAll<HTMLElement>(".reveal").forEach((el) => (el.style.opacity = "1"));
      return;
    }

    let cleanup = () => {};
    let cancelled = false;

    void (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      const ctx = gsap.context(() => {
        // Hero / above-the-fold items animate immediately, staggered.
        const intro = gsap.utils.toArray<HTMLElement>("[data-anim='intro'] .reveal");
        if (intro.length) {
          gsap.to(intro, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power3.out",
            stagger: 0.08,
            startAt: { y: 26 },
          });
        }

        // Everything else animates when scrolled into view.
        gsap.utils
          .toArray<HTMLElement>(".reveal")
          .filter((el) => !el.closest("[data-anim='intro']"))
          .forEach((el, i) => {
            gsap.to(el, {
              opacity: 1,
              y: 0,
              duration: 0.7,
              ease: "power3.out",
              delay: (i % 4) * 0.04,
              startAt: { y: 30 },
              scrollTrigger: { trigger: el, start: "top 88%", once: true },
            });
          });

        // Subtle parallax for anything tagged with data-parallax.
        gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
          const strength = Number(el.dataset.parallax) || 60;
          gsap.to(el, {
            y: strength,
            ease: "none",
            scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
          });
        });
      }, root);

      cleanup = () => ctx.revert();
      ScrollTrigger.refresh();
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return scope;
}

/** Animates a number from 0 to `value` when it scrolls into view. */
export function useCountUp(value: number) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = value.toLocaleString();
      return;
    }

    let cleanup = () => {};
    let cancelled = false;

    void (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const counter = { n: 0 };
      const tween = gsap.to(counter, {
        n: value,
        duration: 1.2,
        ease: "power2.out",
        onUpdate: () => {
          el.textContent = Math.round(counter.n).toLocaleString();
        },
        scrollTrigger: { trigger: el, start: "top 92%", once: true },
      });
      cleanup = () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [value]);

  return ref;
}
