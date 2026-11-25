import { useGameConnection } from "../../hooks/useGameConnection";
import {
  Swords,
  LayoutDashboard,
  Users,
  Layers3,
  Trophy,
  LogOut
} from "lucide-react";

import { NavLink, Outlet } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

const links = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/characters", label: "Characters", icon: Users },
  { path: "/decks", label: "Deck Builder", icon: Layers3 },
  { path: "/play", label: "Battle Arena", icon: Swords },
  { path: "/ranked", label: "Leaderboard", icon: Trophy }
];

export default function GameLayout() {
  useGameConnection();
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen lg:flex">
      <aside className="lg:w-64 lg:fixed lg:inset-y-0 bg-[#101620] border-b lg:border-r border-slate-800 p-5 flex flex-col">
        <div className="flex items-center gap-3 mb-7">
          <Swords className="gold-text" size={30} />

          <span className="gold-text text-xl font-black tracking-wider">
            RIFTARENA
          </span>
        </div>

        <nav className="flex overflow-x-auto lg:flex-col gap-2">
          {links.map(link => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 whitespace-nowrap rounded-lg px-4 py-3 text-sm transition ${
                  isActive
                    ? "bg-[#d4ad70]/10 text-[#d4ad70]"
                    : "text-slate-400 hover:bg-slate-800"
                }`
              }
            >
              <link.icon size={19} />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto pt-6">
          <button
            onClick={logout}
            className="flex gap-3 items-center text-slate-400 hover:text-red-400"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <main className="lg:ml-64 flex-1 min-w-0">
        <header className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
          <div>
            <p className="text-xs text-slate-500">
              COMMANDER
            </p>
            <p className="font-semibold">
              {user?.username}
            </p>
          </div>

          <div className="flex items-center gap-2 gold-text">
            <Trophy size={18} />
            {user?.rating ?? 1000} MMR
          </div>
        </header>

        <div className="p-5 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

