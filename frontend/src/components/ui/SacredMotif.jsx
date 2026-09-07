import { useEffect, useRef, useState } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
 Sacred Motif — leaf components for "Ink and Light" motion

  Every component is:
    - aria-hidden (purely decorative)
    - pointer-events-none
    - guarded for reduced-motion via the global base.css media query
    - guarded for environments without IntersectionObserver (jsdom)
════════════════════════════════════════════════════════════════════════════ */

// ── IntersectionObserver hook (InkLine) ───────────────────────────────────
function useInView(ref) {
  const [inView, setInView] = useState(
    typeof IntersectionObserver === "undefined",
  );

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || !ref.current) {
      setInView(true);
      return;
    }
    const el = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return inView;
}

// ── HaloGlow ── breathing amber radial (lamp at my feet) ──────────────────
export function HaloGlow({ className }) {
  const cls = "sm-halo" + (className ? " " + className : "");
  return <span className={cls} aria-hidden="true" />;
}

// ── InkLine ── gold rule that draws itself when scrolled into view ────────
export function InkLine({ className }) {
  const ref = useRef(null);
  const inView = useInView(ref);
  const cls =
    "sm-inkline" + (inView ? " sm-inview" : "") + (className ? " " + className : "");
  return <div ref={ref} className={cls} aria-hidden="true" />;
}

// ── PressDawn ── slow amber gradient drift on hero panels ─────────────────
export function PressDawn({ className }) {
  const cls = "sm-dawn" + (className ? " " + className : "");
  return <div className={cls} aria-hidden="true" />;
}

// ── CaretBlink ── serif I-beam typing caret ───────────────────────────────
export function CaretBlink() {
  return <span className="sm-caret" aria-hidden="true">│</span>;
}

// ── ReviewFlow ── ink lane during QA / review ─────────────────────────────
export function ReviewFlow({ loading, value, className }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!loading && value != null) {
      const t = setTimeout(() => setShow(true), 60);
      return () => clearTimeout(t);
    }
    setShow(false);
  }, [loading, value]);

  const cls = "sm-flow-track" + (className ? " " + className : "");

  if (loading) {
    return (
      <div className={cls}>
        <span className="sm-flow-fill" aria-hidden="true" />
      </div>
    );
  }

  if (value == null) return null;

  return (
    <div className={cls}>
      <div
        className="sm-fill"
        style={{ width: show ? value + "%" : "0%" }}
      />
    </div>
  );
}

// ── Flyleaf ── auto-advancing verse-of-the-day deck ──────────────────────
export function Flyleaf({ verses, className }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || !verses?.length) return;
    const t = setInterval(
      () => setIndex((i) => (i + 1) % verses.length),
      5000,
    );
    return () => clearInterval(t);
  }, [paused, verses?.length]);

  if (!verses?.length) return null;

  const cls = "sm-flyleaf" + (className ? " " + className : "");

  return (
    <div
      className={cls}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="sm-flyleaf-track"
        style={{ transform: "translateX(-" + index * 100 + "%)" }}
      >
        {verses.map((v, i) => (
          <div key={i} className="sm-flyleaf-slide">
            <p className="sm-flyleaf-text">{v.text}</p>
            <span className="sm-flyleaf-ref">{v.ref}</span>
          </div>
        ))}
      </div>
      <div className="sm-flyleaf-progress-track">
        <div key={index} className="sm-flyleaf-progress-fill" />
      </div>
    </div>
  );
}

// ── ManuscriptShimmer ── one-shot gold shimmer on initial cap ─────────────
export function ManuscriptShimmer({ letter, className }) {
  const cls = "sm-manuscript" + (className ? " " + className : "");
  return <span className={cls} aria-hidden="true">{letter}</span>;
}

// ── PageFlip ── an open Bible continuously leafing its golden pages ───────
export function PageFlip({ className }) {
  const cls = "sm-flipbook" + (className ? " " + className : "");
  return (
    <div className={cls} aria-hidden="true">
      <div className="sm-flipbook-cradle">
        <div className="sm-flipbook-base" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="sm-flipbook-page" />
        ))}
      </div>
    </div>
  );
}

// ── ScriptFade ── large scripture verses fading in and out ────────────────
export function ScriptFade({ verses, className, intervalMs = 6400 }) {
  const [index, setIndex] = useState(0);
  const n = verses?.length || 0;

  useEffect(() => {
    if (n < 2) return;
    const t = setInterval(
      () => setIndex((i) => (i + 1) % n),
      intervalMs,
    );
    return () => clearInterval(t);
  }, [n, intervalMs]);

  if (!n) return null;

  const cls = "sm-scriptfade" + (className ? " " + className : "");

  return (
    <div className={cls} aria-hidden="true">
      {verses.map((v, i) => (
        <p key={i} className={"sm-scriptfade-line" + (i === index ? " on" : "")}>
          <span className="sm-scriptfade-text">{v.text}</span>
          <span className="sm-scriptfade-ref">{v.ref}</span>
        </p>
      ))}
    </div>
  );
}
