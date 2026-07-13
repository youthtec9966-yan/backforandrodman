"use client";

import { useState } from "react";

type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error: { message: string } };
type LoginUser = { role: "super_admin" | "admin" | "operator" };

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const envelope = await response.json() as ApiEnvelope<LoginUser>;
      if (!response.ok || !envelope.ok) {
        throw new Error(!envelope.ok ? envelope.error.message : response.statusText);
      }
      const next = new URLSearchParams(window.location.search).get("next");
      const fallback = envelope.data.role === "super_admin" ? "/super-admin" : "/workspace";
      window.location.href = next && next.startsWith("/") ? next : fallback;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-brand">
          <div className="brand-badge">AI</div>
          <div>
            <h1>数字人管理后台</h1>
            <p>登录后继续管理角色、知识库与发布配置</p>
          </div>
        </div>

        <form className="login-form" onSubmit={(event) => void handleSubmit(event)}>
          <label className="field">
            <span className="label">用户名</span>
            <input className="input" value={username} autoComplete="username" onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label className="field">
            <span className="label">密码</span>
            <input
              className="input"
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {message ? <div className="settings-status warn">{message}</div> : null}
          <button className="btn btn-primary login-submit" disabled={loading || !username.trim() || !password.trim()}>
            {loading ? "登录中..." : "登录"}
          </button>
        </form>

        <div className="settings-status">
          首次引导可通过 `.env.local` 配置超级管理员账号；登录后可在超级管理员控制台统一维护系统密钥。
        </div>
      </section>
    </main>
  );
}
