import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";

const MotionLink = motion.create(Link);

export function BackLink({ to = "/" }) {
  return (
    <MotionLink
      to={to}
      whileHover={{ x: -3 }}
      className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-400 hover:text-brand-600"
    >
      <ArrowLeft className="h-4 w-4" /> Back
    </MotionLink>
  );
}
