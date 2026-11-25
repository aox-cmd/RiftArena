import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import {
  MessageSquare,
  Send,
  LoaderCircle
} from "lucide-react";

import { socket, socketRequest } from "../../services/socket";
import { useAuthStore } from "../../stores/authStore";
import { useMultiplayerStore } from "../../stores/multiplayerStore";

interface ChatMessage {
  id: string;
  matchId: string;
  userId: string;
  username: string;
  text: string;
  createdAt: string;
}

export default function BattleChat({
  matchId
}: {
  matchId: string;
}) {
  const user = useAuthStore(s => s.user);

  const connected = useMultiplayerStore(
    s => s.connected
  );

  const finished = useMultiplayerStore(
    s => s.battle?.status === "COMPLETED"
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([]);
    setError("");

    function receive(message: ChatMessage) {
      if (message.matchId !== matchId) return;

      setMessages(previous => {
        if (previous.some(m => m.id === message.id)) {
          return previous;
        }

        return [...previous, message].slice(-100);
      });
    }

    socket.on("chat:message", receive);

    return () => {
      socket.off("chat:message", receive);
    };
  }, [matchId]);

  useEffect(() => {
    const element = container.current;

    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages]);

  async function send(event: FormEvent) {
    event.preventDefault();

    const cleaned = text.trim();

    if (
      !cleaned ||
      sending ||
      !connected ||
      finished
    ) return;

    setSending(true);
    setError("");

    try {
      await socketRequest("chat:send", {
        matchId,
        text: cleaned
      });

      setText("");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Message could not be sent"
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="game-panel p-5 space-y-4">
      <div className="flex items-center gap-3">
        <MessageSquare className="gold-text" />

        <h2 className="font-bold">
          Battle Chat
        </h2>

        <span className="ml-auto text-xs text-slate-400">
          Private match
        </span>
      </div>

      <div
        ref={container}
        className="h-56 overflow-y-auto bg-[#090d15] rounded-lg p-3 space-y-3"
      >
        {messages.length === 0 && (
          <p className="text-center text-xs text-slate-500 py-5">
            Say hello to your opponent.
          </p>
        )}

        {messages.map(message => {
          const mine = message.userId === user?.id;

          return (
            <div
              key={message.id}
              className={`flex flex-col ${
                mine ? "items-end" : "items-start"
              }`}
            >
              <p className="text-xs text-slate-500 mb-1">
                {mine ? "You" : message.username}
              </p>

              <p className={`max-w-[85%] break-words rounded-xl px-3 py-2 text-sm ${
                mine
                  ? "bg-blue-900/60"
                  : "bg-slate-800"
              }`}>
                {message.text}
              </p>
            </div>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}

      <form onSubmit={send} className="flex gap-2">
        <input
          value={text}
          maxLength={200}
          disabled={!connected || finished || sending}
          onChange={event => setText(event.target.value)}
          placeholder={
            finished
              ? "Battle completed"
              : "Send a message..."
          }
          className="game-input flex-1 min-w-0"
        />

        <button
          type="submit"
          disabled={
            !text.trim() ||
            sending ||
            !connected ||
            finished
          }
          className="gold-button"
        >
          {sending ? (
            <LoaderCircle
              size={18}
              className="animate-spin"
            />
          ) : (
            <Send size={18} />
          )}
        </button>
      </form>

      <p className="text-xs text-slate-500 text-right">
        {text.length}/200
      </p>
    </section>
  );
}
