import { motion } from "framer-motion";

/**
 * Ambient floating "gold dust" motes — slow drifting particles that give the
 * scripture backdrop a sense of life. Decorative only; honors reduced-motion
 * via MotionConfig (particles render static when animations are skipped).
 */
const MOTES = [
  { top: "14%", left: "12%", r: 3, delay: 0, dur: 7 },
  { top: "22%", left: "78%", r: 2, delay: 1.2, dur: 8 },
  { top: "38%", left: "30%", r: 4, delay: 0.6, dur: 9 },
  { top: "52%", left: "85%", r: 2.5, delay: 2, dur: 7.5 },
  { top: "64%", left: "18%", r: 3, delay: 1.6, dur: 8.5 },
  { top: "78%", left: "60%", r: 2, delay: 0.4, dur: 9.5 },
  { top: "86%", left: "8%", r: 2.5, delay: 2.4, dur: 8 },
];

export default function Motes({ className = "" }) {
  return (
    <div className={`motes ${className}`} aria-hidden="true">
      {MOTES.map((m, i) => (
        <motion.span
          key={i}
          className="mote"
          style={{
            top: m.top,
            left: m.left,
            width: m.r * 2,
            height: m.r * 2,
          }}
          initial={{ y: 0, opacity: 0.35 }}
          animate={{ y: [0, -14, 0], opacity: [0.35, 0.8, 0.35] }}
          transition={{
            duration: m.dur,
            delay: m.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}