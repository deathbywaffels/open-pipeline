import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Briefcase,
  User,
  ThumbsDown,
  KanbanSquare,
  Map as MapIcon,
  Settings as SettingsIcon,
  ShieldCheck,
  Compass,
  ClipboardList,
  Users,
  Sparkles,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { QuestWidget } from "../components/QuestWidget.jsx";
import { StreakBadge } from "../components/StreakBadge.jsx";
import { HeroSwipeCard } from "../components/HeroSwipeCard.jsx";
import { AppFooter } from "../components/AppFooter.jsx";
import { FlipTile } from "../components/ui/FlipTile.jsx";
import { Button } from "../components/ui/Button.jsx";

const TILES = [
  {
    to: "/jobs",
    icon: Briefcase,
    label: "Jobs",
    description: "Paste & manage job listings",
    color: "brand",
  },
  {
    to: "/board",
    icon: KanbanSquare,
    label: "Board",
    description: "Track your pipeline stage by stage",
    color: "brand",
  },
  {
    to: "/map",
    icon: MapIcon,
    label: "Map",
    description: "See where your jobs are",
    color: "accent",
  },
  {
    to: "/profile",
    icon: User,
    label: "Profile",
    description: "Your skills & CV",
    color: "slate",
  },
  {
    to: "/preferences",
    icon: ThumbsDown,
    label: "Preferences",
    description: "What you don't want",
    color: "danger",
  },
  {
    to: "/sponsors",
    icon: ShieldCheck,
    label: "Sponsors",
    description: "Track IND-recognized sponsor companies",
    color: "success",
  },
  {
    to: "/coach",
    icon: Compass,
    label: "Coach",
    description: "AI role suggestions & company fit",
    color: "accent",
  },
  {
    to: "/settings",
    icon: SettingsIcon,
    label: "Settings",
    description: "Daily quest target & more",
    color: "slate",
  },
];

const EMPLOYER_TILES = [
  {
    to: "/postings",
    icon: ClipboardList,
    label: "Postings",
    description: "Post & manage job postings",
    color: "brand",
  },
  {
    to: "/candidates",
    icon: Users,
    label: "Candidates",
    description: "Track candidates through your pipeline",
    color: "accent",
  },
  {
    to: "/discovery",
    icon: Sparkles,
    label: "Discover",
    description: "Find candidates matching your postings",
    color: "brand",
  },
];

export default function Home() {
  const { user, logout } = useAuth();
  const [status, setStatus] = useState("loading");
  const isEmployer = user.role === "EMPLOYER";

  const visibleTiles = TILES.filter(
    (tile) => tile.to !== "/sponsors" || user.needsSponsorship,
  );

  useEffect(() => {
    fetch("/api/health")
      .then((res) => {
        if (!res.ok) throw new Error("Health check failed");
        return res.json();
      })
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("error"));
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between">
        <motion.h1
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="text-2xl font-extrabold text-slate-800"
        >
          Welcome back, {user.name} <span aria-hidden="true">👋</span>
        </motion.h1>

        <Button
          variant="secondary"
          onClick={logout}
          aria-label="Log out"
          className="!rounded-full !p-2.5"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      {isEmployer ? (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {EMPLOYER_TILES.map((tile, i) => (
            <FlipTile key={tile.to} {...tile} index={i} />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-col gap-4 md:flex-row">
            <div className="md:flex-[2]">
              <HeroSwipeCard />
            </div>
            <div className="flex flex-col gap-4 md:flex-1">
              <QuestWidget />
              <StreakBadge />
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
            {visibleTiles.map((tile, i) => (
              <FlipTile key={tile.to} {...tile} index={i} />
            ))}
          </div>
        </>
      )}

      <AppFooter status={status} />
    </main>
  );
}
