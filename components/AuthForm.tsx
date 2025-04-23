"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AuthForm({ onAuth }: { onAuth: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    let result;
    if (mode === "sign-in") {
      result = await supabase.auth.signInWithPassword({ email, password });
    } else {
      result = await supabase.auth.signUp({ email, password });
    }
    if (result.error) {
      setError(result.error.message);
    } else {
      onAuth();
    }
    setLoading(false);
  };

  return (
    <div className="max-w-xs mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4 text-center">
        {mode === "sign-in" ? "Sign In" : "Sign Up"}
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email"
          className="border rounded px-3 py-2"
          required
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          className="border rounded px-3 py-2"
          required
        />
        <button
          type="submit"
          className="bg-blue-600 text-white rounded px-3 py-2 mt-2 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Loading..." : mode === "sign-in" ? "Sign In" : "Sign Up"}
        </button>
        {error && <div className="text-red-600 text-sm">{error}</div>}
      </form>
      <div className="mt-4 text-center">
        <button
          className="text-blue-600 underline text-sm"
          onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
        >
          {mode === "sign-in"
            ? "Don't have an account? Sign Up"
            : "Already have an account? Sign In"}
        </button>
      </div>
    </div>
  );
}
