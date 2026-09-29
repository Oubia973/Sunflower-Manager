import React, { useEffect, useState } from "react";
import { fetchJson } from "../services/apiClient.js";

export function openAccountDialog(detail = {}) {
  window.dispatchEvent(new CustomEvent("sflman-account-dialog", { detail }));
}

export default function AccountDialog({ API_URL }) {
  const [state, setState] = useState({ open: false, mode: "login", farmId: "" });
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onOpen = (event) => {
      const detail = event?.detail || {};
      setState({
        open: true,
        mode: detail.mode === "register" ? "register" : "login",
        farmId: String(detail.farmId || ""),
      });
      setLogin("");
      setPassword("");
      setError("");
    };
    window.addEventListener("sflman-account-dialog", onOpen);
    return () => window.removeEventListener("sflman-account-dialog", onOpen);
  }, []);

  if (!state.open) return null;

  const close = () => {
    if (!busy) setState((prev) => ({ ...prev, open: false }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const endpoint = state.mode === "register" ? "/account/register" : "/account/login";
      await fetchJson(API_URL, endpoint, {
        method: "POST",
        body: state.mode === "register"
          ? { farmId: state.farmId, login, password }
          : { login, password },
      });
      window.location.reload();
    } catch (err) {
      setError(err?.message || "Unable to continue.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="account-dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) close();
    }}>
      <div className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-dialog-title">
        <h2 id="account-dialog-title">{state.mode === "register" ? "Create account" : "Farm login"}</h2>
        {state.farmId ? <p>Farm #{state.farmId}</p> : null}
        <form onSubmit={submit}>
          <label>
            Login
            <input autoFocus value={login} onChange={(event) => setLogin(event.target.value)} minLength={3} maxLength={40} required />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={200} required />
          </label>
          {error ? <div className="account-dialog__error">{error}</div> : null}
          <div className="account-dialog__actions">
            <button type="button" className="button" onClick={close} disabled={busy}>Cancel</button>
            <button type="submit" className="button" disabled={busy}>{busy ? "Please wait..." : state.mode === "register" ? "Create account" : "Login"}</button>
          </div>
        </form>
        {state.mode === "login" ? (
          <small>If this farm was registered by someone else, wallet recovery will be available in a later update.</small>
        ) : (
          <small>Creating an account makes this farm private on Sunflower Manager. You will need to log in to load it.</small>
        )}
      </div>
    </div>
  );
}
