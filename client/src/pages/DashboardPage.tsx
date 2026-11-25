import { motion } from "framer-motion";
import { Trophy, Swords, Shield, TrendingUp, Users, Layers3 } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuthStore } from "../stores/authStore";

export default function DashboardPage() {
  const user = useAuthStore(state => state.user);

  const wins = user?.wins ?? 0;
  const losses = user?.losses ?? 0;
  const total = wins + losses;

  const stats = [
    { label: "Rating", value: user?.rating ?? 1000, icon: Trophy, color: "text-amber-400" },
    { label: "Victories", value: wins, icon: Swords, color: "text-emerald-400" },
    { label: "Defeats", value: losses, icon: Shield, color: "text-red-400" },
    { label: "Win rate", value: `${total ? Math.round(wins / total * 100) : 0}%`, icon: TrendingUp, color: "text-violet-400" }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-7"
    >
      <section className="game-panel p-8 md:p-12 relative overflow-hidden">
        <Swords
          size={220}
          className="absolute -right-12 -bottom-16 text-amber-400/5 pointer-events-none"
        />

        <p className="gold-text text-xs tracking-[0.3em] mb-4">
          THE ARENA AWAITS
        </p>

        <h1 className="text-4xl md:text-5xl font-black">
          Forge your legend.
        </h1>

        <p className="text-slate-400 max-w-lg mt-4 mb-7">
          Assemble your heroes and challenge commanders
          in tactical 3v3 battles.
        </p>

        <Link to="/play" className="gold-button inline-block">
          PLAY NOW
        </Link>
      </section>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="game-panel p-5">
            <stat.icon className={stat.color} size={25} />

            <p className="text-3xl font-bold mt-4">
              {stat.value}
            </p>

            <p className="text-slate-400 text-sm mt-1">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Link to="/characters" className="game-panel p-6 hover:border-amber-500/50 transition">
          <Users className="gold-text mb-4" size={30} />
          <h2 className="text-xl font-bold">Your Heroes</h2>
          <p className="text-slate-400 mt-2">
            Explore your characters and their unique abilities.
          </p>
        </Link>

        <Link to="/decks" className="game-panel p-6 hover:border-amber-500/50 transition">
          <Layers3 className="gold-text mb-4" size={30} />
          <h2 className="text-xl font-bold">Battle Formation</h2>
          <p className="text-slate-400 mt-2">
            Build your three-character tactical team.
          </p>
        </Link>
      </div>
    </motion.div>
  );
}
