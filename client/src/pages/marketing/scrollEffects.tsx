import { useEffect, useLayoutEffect, type CSSProperties } from 'react';

const REVEAL_MS = 700;

/** Props that make an element animate in when it scrolls into view. `step` staggers items in a list. */
export const reveal = (step = 0, variant: 'up' | 'left' | 'right' | 'zoom' = 'up') => ({
  'data-reveal': variant,
  style: { '--reveal-delay': `${step * 40}ms` } as CSSProperties,
});

/**
 * Runs the scroll animations for a public page: elements marked with `reveal()`
 * animate in once, and `data-parallax` elements drift with the scroll.
 */
export function useScrollEffects() {
  // Hide reveal targets only once we know JavaScript can reveal them again.
  useLayoutEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const root = document.documentElement;
    root.classList.add('reveal-ready');
    return () => root.classList.remove('reveal-ready');
  }, []);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const timers: number[] = [];
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        observer.unobserve(el);
        el.classList.add('is-in');
        // Drop the markers afterwards so hover effects on the element work normally.
        const delay = parseInt(el.style.getPropertyValue('--reveal-delay'), 10) || 0;
        timers.push(window.setTimeout(() => {
          el.removeAttribute('data-reveal');
          el.classList.remove('is-in');
        }, REVEAL_MS + delay));
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
    return () => {
      observer.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const items = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax]'));
    if (!items.length) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      items.forEach(el => {
        const speed = parseFloat(el.dataset.parallax || '0');
        el.style.transform = `translate3d(0, ${window.scrollY * speed}px, 0)`;
      });
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);
}
