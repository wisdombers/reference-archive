"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { getSiteUrl } from "@/lib/env";

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error("Google 로그인 연결 시간이 초과되었습니다. Redirect URL 설정을 확인해주세요.")), timeoutMs);
    })
  ]);
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isMagicLinkLoading, setIsMagicLinkLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  async function handleGoogleSignIn() {
    setMessage("");
    setIsGoogleLoading(true);

    const supabase = createClient();
    let result;

    try {
      result = await withTimeout(
        supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${getSiteUrl()}/auth/callback`,
            skipBrowserRedirect: true
          }
        }),
        10000
      );
    } catch (error) {
      setIsGoogleLoading(false);
      setMessage(error instanceof Error ? error.message : "Google 로그인 연결에 실패했습니다.");
      return;
    }

    const { data, error } = result;

    if (error) {
      setIsGoogleLoading(false);
      setMessage(error.message);
      return;
    }

    if (!data.url) {
      setIsGoogleLoading(false);
      setMessage("Google 로그인 URL을 만들지 못했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    window.location.assign(data.url);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsMagicLinkLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${getSiteUrl()}/auth/callback`
      }
    });

    setIsMagicLinkLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("매직링크를 보냈습니다. 이메일을 확인해주세요.");
  }

  return (
    <div className="auth-stack">
      <button className="button google-button" type="button" onClick={handleGoogleSignIn} disabled={isGoogleLoading}>
        <span className="google-mark" aria-hidden="true">
          G
        </span>
        {isGoogleLoading ? "Google로 이동 중" : "Google로 계속하기"}
      </button>

      <div className="divider">
        <span>또는 이메일 매직링크</span>
      </div>

      <form className="form-grid compact" onSubmit={handleSubmit}>
        <label className="label">
          이메일
          <input
            className="field"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="creator@example.com"
            required
          />
        </label>
        <button className="button" type="submit" disabled={isMagicLinkLoading}>
          {isMagicLinkLoading ? "전송 중" : "매직링크 받기"}
        </button>
        {message ? <p className="muted">{message}</p> : null}
      </form>
    </div>
  );
}
