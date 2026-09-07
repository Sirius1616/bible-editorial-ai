import { animate, MotionGlobalConfig, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1], type: "tween" },
  },
};

export const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 400, damping: 32 },
  },
  exit: { opacity: 0, y: -6, transition: { duration: 0.12 } },
};

export function AnimatedNumber({ value, className, suffix = "" }) {
  const [display, setDisplay] = useState(
    MotionGlobalConfig.skipAnimations ? value : 0,
  );
  const last = useRef(0);

  useEffect(() => {
    if (MotionGlobalConfig.skipAnimations) return;
    const controls = animate(last.current, value, {
      duration: 0.7,
      ease: "easeOut",
      onUpdate: (v) => {
        last.current = v;
        setDisplay(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [value]);

  return (
    <span className={className}>
      {display}
      {suffix}
    </span>
  );
}

export function MotionList({ children, ...rest }) {
  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" {...rest}>
      {children}
    </motion.div>
  );
}

export function MotionItem({ children, ...rest }) {
  return <motion.div variants={staggerItem} {...rest}>{children}</motion.div>;
}

/**
 * Animated score gauge — an SVG ring that sweeps from 0 to `value`.
 * Great for Style/QA/Consistency scores. Honors reduced-motion via MotionConfig.
 */
export function ScoreRing({ value, size = 72, stroke = 6, label, tone = "auto" }) {
  const safe = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(
    MotionGlobalConfig.skipAnimations ? circ * (1 - safe / 100) : circ,
  );

  useEffect(() => {
    if (MotionGlobalConfig.skipAnimations) {
      setOffset(circ * (1 - safe / 100));
      return;
    }
    const controls = animate(circ, circ * (1 - safe / 100), {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setOffset(v),
    });
    return () => controls.stop();
  }, [safe, circ]);

  const toneClass =
    tone === "auto"
      ? safe >= 90
        ? "ring-good"
        : safe >= 70
          ? "ring-mid"
          : "ring-bad"
      : tone;

  return (
    <div className={`score-ring ${toneClass}`} role="img" aria-label={`Score ${safe}/100`}>
      <svg width={size} height={size} aria-hidden="true">
        <circle
          className="score-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className="score-ring-value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="score-ring-label">
        <strong>{Math.round(circ ? (1 - offset / circ) * 100 : safe)}</strong>
        <small>/{label || 100}</small>
      </span>
    </div>
  );
}