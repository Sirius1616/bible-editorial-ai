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