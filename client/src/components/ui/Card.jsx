import { motion } from "motion/react";

export function Card({
  as = "div",
  className = "",
  delay = 0,
  hover = false,
  children,
  ...props
}) {
  const MotionComponent = motion[as] ?? motion.div;

  return (
    <MotionComponent
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      whileHover={
        hover
          ? { y: -4, boxShadow: "0 12px 24px -8px rgb(0 0 0 / 0.12)" }
          : undefined
      }
      className={`rounded-3xl border border-slate-100 bg-white p-5 shadow-sm ${className}`}
      {...props}
    >
      {children}
    </MotionComponent>
  );
}
