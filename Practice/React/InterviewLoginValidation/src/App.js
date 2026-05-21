import React, { useMemo, useState } from 'react';
import './App.css';

// Example rule (adjust to match your interview prompt):
// 3–20 chars, must start with a letter, then letters/numbers/underscore.
const USERNAME_REGEX = /^[A-Za-z][A-Za-z0-9_]{2,19}$/;

function validateUsername(value) {
  if (!value) return 'Username is required';
  if (!USERNAME_REGEX.test(value))
    return '3–20 chars, start with a letter, then letters/numbers/_';
  return '';
}

function passwordChecks(value) {
  return {
    hasLower: /[a-z]/.test(value),
    hasUpper: /[A-Z]/.test(value),
    hasSpecial: /[^A-Za-z0-9]/.test(value),
    minLen: value.length >= 8,
  };
}

function validatePassword(value) {
  if (!value) return 'Password is required';
  const c = passwordChecks(value);
  if (!c.minLen) return 'Must be at least 8 characters';
  if (!c.hasLower) return 'Must include a lowercase letter';
  if (!c.hasUpper) return 'Must include an uppercase letter';
  if (!c.hasSpecial) return 'Must include a special character';
  return '';
}

function Pill({ ok, children }) {
  return <span className={`pill ${ok ? 'pillOk' : 'pillBad'}`}>{children}</span>;
}

export default function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ username: false, password: false });
  const [submitted, setSubmitted] = useState(false);

  const errors = useMemo(
    () => ({
      username: validateUsername(username),
      password: validatePassword(password),
    }),
    [username, password]
  );

  const checks = useMemo(() => passwordChecks(password), [password]);

  const canSubmit = Boolean(username && password && !errors.username && !errors.password);

  function onSubmit(e) {
    e.preventDefault();
    setTouched({ username: true, password: true });
    setSubmitted(true);
    if (!canSubmit) return;
  }

  return (
    <div className="page">
      <div className="card">
        <header className="header">
          <h1>Login (real-time validation)</h1>
        </header>

        <div className="content">
          <form onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, username: true }))}
                placeholder="e.g. john_doe"
                autoComplete="username"
              />
              <p className="hint">Regex: {String(USERNAME_REGEX)}</p>
              {touched.username && errors.username ? (
                <p className="error" role="alert">
                  {errors.username}
                </p>
              ) : null}
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              {touched.password && errors.password ? (
                <p className="error" role="alert">
                  {errors.password}
                </p>
              ) : null}

              <div className="pillRow" aria-label="password rules">
                <Pill ok={checks.minLen}>8+ chars</Pill>
                <Pill ok={checks.hasLower}>lowercase</Pill>
                <Pill ok={checks.hasUpper}>uppercase</Pill>
                <Pill ok={checks.hasSpecial}>special</Pill>
              </div>
            </div>

            <div className="actions">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setUsername('');
                  setPassword('');
                  setTouched({ username: false, password: false });
                  setSubmitted(false);
                }}
              >
                Reset
              </button>
              <button type="submit" className="btn btnPrimary" disabled={!canSubmit}>
                Log in
              </button>
            </div>
          </form>

          {submitted && canSubmit ? (
            <p className="hint" style={{ marginTop: 14 }}>
              Submitted (demo). In an interview, mention you’d avoid sending passwords to logs.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

