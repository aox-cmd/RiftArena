import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import {
  Trophy, Crown, Shield, Swords,
  History, LoaderCircle
} from "lucide-react";

import { api, getErrorMessage } from "../services/api";
import { useAuthStore } from "../stores/authStore";

interface RankedPlayer {
  id: string;
  username: string;
  rating: number;
  wins: number;
  losses: number;
  position: number;
  rank: string;
  winRate: number;
}

interface MatchHistory {
  id: string;
  mode: "QUICK" | "RANKED";
  opponent: string;
  result: "VICTORY" | "DEFEAT" | "DRAW";
  duration: number;
  finishedAt: string;
}

const colors: Record<string, string> = {
  Bronze: "#b77945",
  Silver: "#a1a1aa",
  Gold: "#eab308",
  Platinum: "#2dd4bf",
  Diamond: "#60a5fa",
  Master: "#a78bfa",
  Legend: "#f87171"
};

export default function RankedPage() {
  const user = useAuthStore(s => s.user);

  const [players, setPlayers] = useState<RankedPlayer[]>([]);
  const [history, setHistory] = useState<MatchHistory[]>([]);

  const [tab, setTab] = useState<"ranking" | "history">("ranking");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    Promise.all([
      api.get<RankedPlayer[]>("/ranking/leaderboard"),
      api.get<MatchHistory[]>("/ranking/history")
    ])
      .then(([ranking, matches]) => {
        if (!active) return;

        setPlayers(ranking.data);
        setHistory(matches.data);
      })
      .catch(error => {
        if (active) setError(getErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const me = players.find(p => p.id === user?.id);

  if (loading) {
    return (
      <LoaderCircle className="animate-spin gold-text mx-auto" />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-3xl font-black">
          Hall of Legends
        </h1>

        <p className="text-slate-400 mt-2">
          Challenge the strongest commanders.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-red-400">
          {error}
        </p>
      )}

      {me && (
        <section className="game-panel p-6 flex items-center gap-5">
          <Shield
            size={55}
            color={colors[me.rank]}
          />

          <div className="flex-1">
            <p className="text-sm text-slate-400">
              YOUR COMPETITIVE RANK
            </p>

            <h2
              className="text-3xl font-black"
              style={{ color: colors[me.rank] }}
            >
              {me.rank}
            </h2>

            <p className="text-slate-400">
              Global position #{me.position}
            </p>
          </div>

          <div className="text-right">
            <p className="text-3xl font-black gold-text">
              {me.rating}
            </p>

            <p className="text-xs text-slate-400">
              RATING
            </p>
          </div>
        </section>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => setTab("ranking")}
          className={`flex items-center gap-2 rounded-lg px-5 py-3 ${
            tab === "ranking"
              ? "gold-button"
              : "game-panel"
          }`}
        >
          <Trophy size={18} />
          Leaderboard
        </button>

        <button
          onClick={() => setTab("history")}
          className={`flex items-center gap-2 rounded-lg px-5 py-3 ${
            tab === "history"
              ? "gold-button"
              : "game-panel"
          }`}
        >
          <History size={18} />
          Match History
        </button>
      </div>

      {tab === "ranking" ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            {players.slice(0, 3).map(player => (
              <section
                key={player.id}
                className="game-panel p-4 text-center space-y-3"
              >
                <Crown
                  size={40}
                  color={
                    player.position === 1
                      ? "#eab308"
                      : player.position === 2
                        ? "#cbd5e1"
                        : "#cd7f32"
                  }
                  className="mx-auto"
                />

                <p className="text-xs text-slate-400">
                  #{player.position}
                </p>

                <h3 className="font-bold truncate">
                  {player.username}
                </h3>

                <p className="text-2xl font-black gold-text">
                  {player.rating}
                </p>

                <p
                  className="text-sm"
                  style={{ color: colors[player.rank] }}
                >
                  {player.rank}
                </p>
              </section>
            ))}
          </div>

          <section className="game-panel overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-400 border-b border-slate-800">
                <tr>
                  {["#", "Commander", "Rank", "Rating", "W/L", "Win rate"].map(label => (
                    <th key={label} className="p-4">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {players.map(player => (
                  <tr
                    key={player.id}
                    className={`border-b border-slate-800 ${
                      player.id === user?.id
                        ? "bg-amber-500/10"
                        : ""
                    }`}
                  >
                    <td className="p-4">
                      {player.position}
                    </td>

                    <td className="p-4 font-semibold">
                      {player.username}
                    </td>

                    <td
                      className="p-4"
                      style={{ color: colors[player.rank] }}
                    >
                      {player.rank}
                    </td>

                    <td className="p-4 gold-text font-bold">
                      {player.rating}
                    </td>

                    <td className="p-4">
                      {player.wins}/{player.losses}
                    </td>

                    <td className="p-4">
                      {player.winRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : (
        <section className="space-y-3">
          {history.length === 0 && (
            <div className="game-panel p-10 text-center text-slate-400">
              No completed matches yet.
            </div>
          )}

          {history.map(match => (
            <div
              key={match.id}
              className="game-panel p-5 flex items-center gap-4"
            >
              <Swords
                size={30}
                className="gold-text"
              />

              <div className="flex-1">
                <p className="font-bold">
                  vs {match.opponent}
                </p>

                <p className="text-xs text-slate-400 mt-1">
                  {match.mode} - {new Date(match.finishedAt).toLocaleString()}
                </p>
              </div>

              <div className="text-right">
                <p className={`font-black ${
                  match.result === "VICTORY"
                    ? "text-emerald-400"
                    : match.result === "DEFEAT"
                      ? "text-red-400"
                      : "text-slate-400"
                }`}>
                  {match.result}
                </p>

                <p className="text-xs text-slate-400">
                  {Math.floor(match.duration / 60)}m {match.duration % 60}s
                </p>
              </div>
            </div>
          ))}
        </section>
      )}
    </motion.div>
  );
}
