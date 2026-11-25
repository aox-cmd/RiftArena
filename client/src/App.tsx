import RankedPage from "./pages/RankedPage";
import LobbyPage from "./pages/LobbyPage";
import BattlePage from "./pages/BattlePage";
import DecksPage from "./pages/DecksPage";
import { useEffect } from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from "react-router-dom";

import { LoaderCircle } from "lucide-react";

import { useAuthStore } from "./stores/authStore";

import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import CharactersPage from "./pages/CharactersPage";
import GameLayout from "./components/layout/GameLayout";

function Placeholder({ title }: { title: string }) {
  return (
    <div className="game-panel p-8">
      <h1 className="text-3xl font-bold gold-text">
        {title}
      </h1>

      <p className="text-slate-400 mt-3">
        Coming in the next development phase.
      </p>
    </div>
  );
}

function AppRoutes() {
  const { user, initializing, initialize } = useAuthStore();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoaderCircle size={40} className="animate-spin gold-text" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/auth"
        element={user ? <Navigate to="/" replace /> : <AuthPage />}
      />

      <Route
        element={
          user ? <GameLayout /> : <Navigate to="/auth" replace />
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="/characters" element={<CharactersPage />} />
        <Route path="/decks" element={<DecksPage />} />
        <Route path="/play" element={<LobbyPage />} />
        <Route path="/battle/:matchId" element={<BattlePage />} />
        <Route path="/ranked" element={<RankedPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}



