import { motion } from "motion/react";

const VARIANTS = {
  primary:
    "bg-brand-600 text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700",
  success:
    "bg-success-500 text-white shadow-lg shadow-success-500/25 hover:bg-success-600",
  danger:
    "bg-danger-500 text-white shadow-lg shadow-danger-500/25 hover:bg-danger-600",
  secondary:
    "bg-white text-slate-700 border-2 border-slate-200 hover:border-brand-300 hover:text-brand-700",
  ghost: "bg-transparent text-slate-500 hover:text-slate-800",
};

const SPRING = { type: "spring", stiffness: 400, damping: 17 };

export function Button({
  variant = "primary",
  className = "",
  disabled = false,
  children,
  ...props
}) {
  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.04 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={SPRING}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
