"use client";

import { useState } from "react";

export function LoginForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true); setError("");
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: formData.get("username"), password: formData.get("password") }) });
    if (response.ok) window.location.assign("/");
    else { const result = await response.json(); setError(result.error || "Unable to sign in."); setLoading(false); }
  }

  return <form action={submit} className="login-card"><div className="login-mark">SF</div><p className="eyebrow">StitchFlow</p><h1>Welcome back</h1><p className="muted">Sign in to manage production, orders, and delivery.</p><label>Username<input name="username" autoComplete="username" required placeholder="Enter username" /></label><label>Password<input name="password" type="password" autoComplete="current-password" required placeholder="Enter password" /></label><p className="login-error" aria-live="polite">{error}</p><button className="primary login-button" disabled={loading} type="submit">{loading ? "Signing in…" : "Sign in"}</button><small>Secure internal access · StitchFlow Production Control</small></form>;
}
