"use client";
import Link from "next/link";
import { useState } from "react";
import { Bot, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { loginUser } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("demo@axon.ai");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await loginUser(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-convix-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-foreground">Axon AI</span>
        </div>
        <div className="bg-white rounded-2xl border border-border p-8 shadow-sm">
          <h1 className="text-xl font-bold text-foreground mb-1">Welcome back</h1>
          <p className="text-sm text-muted-foreground mb-6">Sign in to your dashboard</p>
          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                required
                onChange={(event) => setEmail(event.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Password</label>
              <input
                type="password"
                value={password}
                required
                onChange={(event) => setPassword(event.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
            </div>
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-1.5 text-muted-foreground cursor-pointer">
                <input type="checkbox" className="rounded" /> Remember me
              </label>
              <Link href="#" className="text-convix-600 hover:text-convix-700">Forgot password?</Link>
            </div>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-convix-600 text-white font-semibold rounded-lg hover:bg-convix-700 disabled:opacity-70 transition-colors text-sm">
              {loading ? "Signing in..." : <><span>Sign in</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-4">
          No account? <Link href="/signup" className="text-convix-600 hover:text-convix-700 font-medium">Start free trial</Link>
        </p>
      </div>
    </div>
  );
}
