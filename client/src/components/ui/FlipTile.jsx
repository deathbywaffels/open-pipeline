import { Link } from "react-router-dom";
import { motion } from "motion/react";

const MotionLink = motion.create(Link);

const COLOR_MAP = {
  brand: "bg-brand-600",
  accent: "bg-accent-500",
  success: "bg-success-600",
  danger: "bg-danger-500",
  slate: "bg-slate-700",
};

export function FlipTile({
  to,
  icon: Icon,
  label,
  description,
  color = "brand",
  index = 0,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: 0.04 * index, ease: "easeOut" }}
      style={{ perspective: 800 }}
      className="h-32"
    >
      <MotionLink
        to={to}
        aria-label={`${label}: ${description}`}
        initial={{ rotateY: 0 }}
        whileHover={{ rotateY: 180, scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative block h-full w-full"
      >
        <div
          style={{ backfaceVisibility: "hidden" }}
          className={`absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl text-white shadow-sm ${COLOR_MAP[color]}`}
        >
          <Icon className="h-7 w-7" />
          <span className="text-sm font-bold">{label}</span>
        </div>

        <div
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          className={`absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-2xl p-3 text-center text-white shadow-sm ${COLOR_MAP[color]}`}
        >
          <span className="text-xs font-semibold leading-snug">
            {description}
          </span>
        </div>
      </MotionLink>
    </motion.div>
  );
}
