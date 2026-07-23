import { Coffee, Mail, Info } from "lucide-react";

const FEEDBACK_EMAIL = "villen00madz@gmail.com";
const KOFI_URL = "https://ko-fi.com/maddy17095";
const FEEDBACK_MAILTO = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(
  "Open Pipeline feedback",
)}`;

export function AppFooter({ status }) {
  return (
    <footer className="mt-12 border-t border-slate-100 pt-6 text-center">
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
        <a
          href={KOFI_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-full bg-accent-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-accent-500/25 transition-transform hover:scale-105"
        >
          <Coffee className="h-3.5 w-3.5" /> Buy me a coffee
        </a>
        <a
          href={FEEDBACK_MAILTO}
          className="flex items-center gap-1.5 rounded-full border-2 border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:border-brand-300 hover:text-brand-700"
        >
          <Mail className="h-3.5 w-3.5" /> Got an idea or a bug?
        </a>
      </div>

      <p className="mx-auto mt-4 max-w-md text-[11px] leading-relaxed text-slate-400">
        <Info className="mb-0.5 inline h-3 w-3" /> Open Pipeline is a tool for
        managing your own search or hiring pipeline, not career or hiring advice
        — it doesn't guarantee interviews, offers, or a job, and isn't liable
        for how your search or hiring goes. Built with AI assistance as part of
        its development.
      </p>

      <p
        data-testid="health-status"
        className="mt-4 text-center text-xs text-slate-300"
      >
        System status: {status}
      </p>
    </footer>
  );
}
