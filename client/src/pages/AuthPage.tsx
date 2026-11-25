import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Swords, LoaderCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuthStore } from "../stores/authStore";
import { getErrorMessage } from "../services/api";

export default function AuthPage() {
  const navigate = useNavigate();

  const { login, register } = useAuthStore();

  const [registering, setRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      if (registering) {
        await register(username, email, password);
      } else {
        await login(email, password);
      }

      navigate("/", { replace: true });
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-9">
          <Swords
            size={54}
            className="mx-auto gold-text mb-4"
          />

          <h1 className="text-4xl font-black tracking-[0.18em] gold-text">
            RIFTARENA
          </h1>

          <p className="text-xs tracking-[0.25em] text-slate-400 mt-3">
            COMMAND. CONQUER. ASCEND.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="game-panel p-7 space-y-5"
        >
          <div>
            <h2 className="text-2xl font-bold">
              {registering
                ? "Become a Commander"
                : "Welcome back, Commander."}
            </h2>

            <p className="text-slate-400 mt-2 text-sm">
              Your next battle awaits.
            </p>
          </div>

          {registering && (
            <label className="block space-y-2">
              <span className="text-sm text-slate-300">
                Username
              </span>

              <input
                className="game-input"
                value={username}
                onChange={e => setUsername(e.target.value)}
                minLength={3}
                maxLength={24}
                pattern="[a-zA-Z0-9_]+"
                required
              />
            </label>
          )}

          <label className="block space-y-2">
            <span className="text-sm text-slate-300">
              Email address
            </span>

            <input
              type="email"
              className="game-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-slate-300">
              Password
            </span>

            <input
              type="password"
              className="game-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={
                registering ? "new-password" : "current-password"
              }
              minLength={8}
              required
            />
          </label>

          {error && (
            <p role="alert" className="text-red-400 text-sm">
              {error}
            </p>
          )}

          <button
            disabled={loading}
            className="gold-button w-full flex justify-center"
          >
            {loading ? (
              <LoaderCircle className="animate-spin" />
            ) : registering ? (
              "CREATE ACCOUNT"
            ) : (
              "ENTER THE ARENA"
            )}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setRegistering(!registering);
              setError("");
            }}
            className="text-sm gold-text w-full"
          >
            {registering
              ? "Already a commander? Sign in"
              : "New commander? Create an account"}
          </button>
        </form>
      </motion.div>
    </main>
  );
}
