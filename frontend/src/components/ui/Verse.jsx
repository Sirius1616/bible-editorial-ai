import { motion } from "framer-motion";

/**
 * Scripture accent — a serif, gold-ruled verse callout used to thread the
 * "parchment & quill" identity through the app (login brand, empty states, etc.).
 * Honors reduced-motion via MotionConfig.
 */
export default function Verse({ text, reference, animate = false }) {
  return (
    <blockquote className="verse-accent">
      <span className="verse-text">{text}</span>
      {reference && (
        <cite className="verse-ref">— {reference}</cite>
      )}
    </blockquote>
  );
}

export function VerseFade({ text, reference }) {
  return (
    <motion.blockquote
      className="verse-accent"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
    >
      <span className="verse-text">{text}</span>
      {reference && <cite className="verse-ref">— {reference}</cite>}
    </motion.blockquote>
  );
}
