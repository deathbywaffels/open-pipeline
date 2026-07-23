export function TextField({
  label,
  as: Component = "input",
  className = "",
  ...props
}) {
  return (
    <label className="block text-sm font-semibold text-slate-600">
      {label}
      <Component
        className={`mt-1 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-brand-400 ${className}`}
        {...props}
      />
    </label>
  );
}
