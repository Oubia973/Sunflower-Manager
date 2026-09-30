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
  const [walletAddress, setWalletAddress] = useState("");
  const [challenge, setChallenge] = useState(null);

  useEffect(() => {
    const onOpen = (event) => {
      const detail = event?.detail || {};
      setState({
        open: true,
        mode: ["register", "recover"].includes(detail.mode) ? detail.mode : "login",
        farmId: String(detail.farmId || ""),
      });
      setLogin("");
      setPassword("");
      setError("");
      setWalletAddress("");
      setChallenge(null);
    };
    window.addEventListener("sflman-account-dialog", onOpen);
    return () => window.removeEventListener("sflman-account-dialog", onOpen);
  }, []);

  if (!state.open) return null;

  const close = () => {
    if (!busy) setState((prev) => ({ ...prev, open: false }));
  };

  const connectWallet = async () => {
    if (!window.ethereum?.request) {
      setError("A browser wallet is required to sign the recovery message.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const addresses = await window.ethereum.request({ method: "eth_requestAccounts" });
      const address = addresses?.[0];
      if (!address) throw new Error("No wallet selected.");
      setWalletAddress(address);
      const next = await fetchJson(API_URL, "/account/recovery/challenge", {
        method: "POST", body: { farmId: state.farmId, address },
      });
      setChallenge(next);
    } catch (err) {
      setChallenge(null);
      setError(err?.message || "Unable to connect wallet.");
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (state.mode === "recover") {
        if (!challenge || !walletAddress) throw new Error("Connect the farm owner's wallet first.");
        const current = await window.ethereum.request({ method: "eth_accounts" });
        if (!current?.some((address) => address.toLowerCase() === walletAddress.toLowerCase())) {
          throw new Error("The connected wallet changed. Connect it again.");
        }
        const signature = await window.ethereum.request({
          method: "personal_sign", params: [challenge.message, walletAddress],
        });
        await fetchJson(API_URL, "/account/recovery/complete", {
          method: "POST", body: { nonce: challenge.nonce, signature, login, password },
        });
      } else {
        const endpoint = state.mode === "register" ? "/account/register" : "/account/login";
        await fetchJson(API_URL, endpoint, {
          method: "POST",
          body: state.mode === "register" ? { farmId: state.farmId, login, password } : { login, password },
        });
      }
      window.location.reload();
    } catch (err) {
      if (state.mode === "recover") setChallenge(null);
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
        <div className="account-dialog__header">
          <h2 id="account-dialog-title">{state.mode === "register" ? "Create account" : state.mode === "recover" ? "Recover farm account" : "Farm login"}</h2>
          {state.farmId ? <p className="account-dialog__farm">Farm #{state.farmId}</p> : null}
        </div>
        <form onSubmit={submit}>
          {state.mode === "recover" ? (
            <>
              {!state.farmId ? <label>Farm ID<input value={state.farmId} onChange={(event) => { setState((prev) => ({ ...prev, farmId: event.target.value })); setChallenge(null); }} inputMode="numeric" pattern="[0-9]+" required /></label> : null}
              <p className="account-dialog__wallet-note">Your wallet may say this site can request transactions. This recovery asks only for your wallet address and a message signature. Our server then reads Farm NFT ownership. No transaction or token approval is requested.</p>
              <button type="button" className="button" onClick={connectWallet} disabled={busy || !state.farmId}>{walletAddress ? `Wallet ${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : "Connect wallet"}</button>
              {challenge ? <div className="account-dialog__message"><span>Message to sign:</span><pre>{challenge.message}</pre></div> : null}
            </>
          ) : null}
          <label>
            {state.mode === "recover" ? "New login" : "Login"}
            <input autoFocus value={login} onChange={(event) => setLogin(event.target.value)} minLength={3} maxLength={40} required />
          </label>
          <label>
            {state.mode === "recover" ? "New password" : "Password"}
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={200} required />
          </label>
          {error ? <div className="account-dialog__error" role="alert">{error}</div> : null}
          <div className="account-dialog__actions">
            <button type="button" className="button" onClick={close} disabled={busy}>Cancel</button>
            <button type="submit" className="button" disabled={busy || (state.mode === "recover" && !challenge)}>{busy ? "Please wait..." : state.mode === "register" ? "Create account" : state.mode === "recover" ? "Sign and recover" : "Login"}</button>
          </div>
        </form>
        {state.mode === "login" ? (
          <button type="button" className="account-dialog__link" onClick={() => { setState((prev) => ({ ...prev, mode: "recover" })); setError(""); }}>Recover with the farm owner&apos;s wallet</button>
        ) : state.mode === "recover" ? (
          <small className="account-dialog__note">The signature proves wallet control. The server also checks current Farm NFT ownership. Recovery replaces the login and password and signs out previous sessions. No transaction or fee is requested.</small>
        ) : (
          <small className="account-dialog__note">Creating an account makes this farm private on Sunflower Manager. You will need to log in to load it.</small>
        )}
      </div>
    </div>
  );
}
