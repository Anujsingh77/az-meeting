"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, User, Eye, EyeOff, Globe } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button, Input } from "@/components/ui";
import toast from "react-hot-toast";

type Mode = "signin" | "signup" | "forgot";

export default function LoginPage() {
  const router = useRouter();
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithGithub, resetPassword } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "github" | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Invalid email";
    if (mode !== "forgot") {
      if (!password) e.password = "Password is required";
      else if (password.length < 6) e.password = "Min 6 characters";
    }
    if (mode === "signup" && !name.trim()) e.name = "Name is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await resetPassword(email);
        if (error) toast.error(error.message);
        else { toast.success("Reset link sent — check your inbox!"); setMode("signin"); }
      } else if (mode === "signup") {
        const { error } = await signUpWithEmail(email, password, name);
        if (error) toast.error(error.message);
        else { toast.success("Account created! Check your email to confirm."); setMode("signin"); }
      } else {
        const { error } = await signInWithEmail(email, password);
        if (error) toast.error(error.message);
        else { toast.success("Welcome back!"); router.push("/dashboard"); }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setSocialLoading("google");
    const { error } = await signInWithGoogle();
    if (error) { toast.error(error.message); setSocialLoading(null); }
    // redirect handled by Supabase OAuth flow
  };

  const handleGithub = async () => {
    setSocialLoading("github");
    const { error } = await signInWithGithub();
    if (error) { toast.error(error.message); setSocialLoading(null); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-accent/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-500/8 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="bg-card border border-border rounded-3xl p-8 w-full max-w-[420px] shadow-xl relative z-10"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-10 h-10 rounded-2xl accent-gradient flex items-center justify-center text-white font-black text-sm">
            AZ
          </div>
          <span className="font-black text-xl tracking-tight">
            <span className="accent-gradient-text">A-Z</span> Meeting
          </span>
        </div>

        <h1 className="text-xl font-bold text-center text-foreground mb-1">
          {mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset password"}
        </h1>
        <p className="text-sm text-muted-foreground text-center mb-7">
          {mode === "signin"
            ? "Sign in to start multilingual meetings"
            : mode === "signup"
            ? "Free forever. No credit card needed."
            : "Enter your email and we'll send a reset link"}
        </p>

        {/* Social buttons */}
        {mode !== "forgot" && (
          <>
            <div className="flex flex-col gap-3 mb-5">
              <button
                onClick={handleGoogle}
                disabled={!!socialLoading || loading}
                className="flex items-center justify-center gap-3 w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-medium text-foreground hover:border-accent/50 hover:bg-muted/80 transition-all disabled:opacity-60"
              >
                {socialLoading === "google" ? (
                  <div className="w-[18px] h-[18px] border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                    <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A9.009 9.009 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 6.294C4.672 4.167 6.656 3.58 9 3.58z"/>
                  </svg>
                )}
                Continue with Google
              </button>
              <button
                onClick={handleGithub}
                disabled={!!socialLoading || loading}
                className="flex items-center justify-center gap-3 w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-medium text-foreground hover:border-accent/50 hover:bg-muted/80 transition-all disabled:opacity-60"
              >
                {socialLoading === "github" ? (
                  <div className="w-[18px] h-[18px] border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                )}
                Continue with GitHub
              </button>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or with email</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {mode === "signup" && (
            <Input
              label="Full name"
              placeholder="e.g. Arjun Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              icon={<User size={16} />}
              autoComplete="name"
            />
          )}
          <Input
            label="Email address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            icon={<Mail size={16} />}
            autoComplete="email"
          />
          {mode !== "forgot" && (
            <div className="relative">
              <Input
                label="Password"
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                icon={<Lock size={16} />}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-[34px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          )}

          {mode === "signin" && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="text-xs text-accent hover:underline"
              >
                Forgot password?
              </button>
            </div>
          )}

          <Button type="submit" size="lg" loading={loading} className="w-full mt-2">
            {mode === "signin" ? "Sign in →" : mode === "signup" ? "Create account →" : "Send reset link →"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          {mode === "signin" ? (
            <>Don't have an account?{" "}
              <button onClick={() => setMode("signup")} className="text-accent font-semibold hover:underline">Sign up free</button>
            </>
          ) : mode === "signup" ? (
            <>Already have an account?{" "}
              <button onClick={() => setMode("signin")} className="text-accent font-semibold hover:underline">Sign in</button>
            </>
          ) : (
            <button onClick={() => setMode("signin")} className="text-accent font-semibold hover:underline">← Back to sign in</button>
          )}
        </p>

        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-muted-foreground">
          <Globe size={12} />
          50+ languages · End-to-end encrypted
        </div>
      </motion.div>
    </div>
  );
}
