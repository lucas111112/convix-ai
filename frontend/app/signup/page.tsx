"use client";
import Link from "next/link";
import { useState } from "react";
import { Bot, ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";

// TODO: REPLACE WITH API — POST /auth/register

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); router.push("/dashboard"); }, 1400);
  };

  return (
    <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-convix-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-foreground">Convix AI</span>
        </div>
        <div className="bg-white rounded-2xl border border-border p-8 shadow-sm">
          <h1 className="text-xl font-bold text-foreground mb-1">Start your free trial</h1>
          <p className="text-sm text-muted-foreground mb-5">14 days free · No credit card required</p>
          <div className="flex flex-col gap-1.5 mb-6">
            {["Full access to all features", "Up to 500 conversations", "14-day money-back guarantee"].map(f => (
              <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Check className="w-3.5 h-3.5 text-green-500 shrink-0" /> {f}
              </div>
            ))}
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Full Name</label>
              <input type="text" required placeholder="Jane Smith"
                className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Work Email</label>
              <input type="email" required placeholder="jane@mystore.com"
                className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Password</label>
              <input type="password" required placeholder="Min. 8 characters"
                className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-convix-500" />
            </div>
            <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" required className="mt-0.5 rounded" />
              I agree to the <Link href="#" className="text-convix-600 underline">Terms of Service</Link> and <Link href="#" className="text-convix-600 underline">Privacy Policy</Link>
            </label>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-convix-600 text-white font-semibold rounded-lg hover:bg-convix-700 disabled:opacity-70 transition-colors text-sm">
              {loading ? "Creating account..." : <><span>Create free account</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Already have an account? <Link href="/login" className="text-convix-600 hover:text-convix-700 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
