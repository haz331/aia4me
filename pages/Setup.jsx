import { useState, useEffect } from "react";

export default function Setup() {
  const [apiKey, setApiKey] = useState("");
  const [assistantName, setAssistantName] = useState("");
  const [userName, setUserName] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Pre-fill if already configured
    const saved = localStorage.getItem("aia4me_config");
    if (saved) {
      const config = JSON.parse(saved);
      setApiKey(config.apiKey || "");
      setAssistantName(config.assistantName || "");
      setUserName(config.userName || "");
    }
  }, []);

  const testAndSave = async () => {
    setError("");
    if (!apiKey.trim()) { setError("Please enter your OpenAI API key."); return; }
    if (!assistantName.trim()) { setError("Please give your assistant a name."); return; }
    if (!userName.trim()) { setError("Please enter your name."); return; }

    setTesting(true);
    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { "Authorization": `Bearer ${apiKey.trim()}` }
      });
      if (!res.ok) {
        setError("Invalid API key. Please check and try again.");
        setTesting(false);
        return;
      }
      // Save to localStorage
      localStorage.setItem("aia4me_config", JSON.stringify({
        apiKey: apiKey.trim(),
        assistantName: assistantName.trim(),
        userName: userName.trim(),
      }));
      setSuccess(true);
      setTimeout(() => { window.location.href = "/"; }, 1500);
    } catch {
      setError("Could not connect. Check your internet and try again.");
    }
    setTesting(false);
  };

  return (
    <div style={{
      minHeight: "100dvh", background: "#0a0a0f",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "24px",
      fontFamily: "'Inter', -apple-system, sans-serif", color: "#e0e0e0"
    }}>
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: "36px" }}>
        <div style={{
          width: "72px", height: "72px", borderRadius: "50%",
          background: "linear-gradient(135deg, #4f8ef7, #1a3a6b)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "28px", fontWeight: "900", color: "white",
          boxShadow: "0 0 32px rgba(79,142,247,0.5)",
          margin: "0 auto 16px"
        }}>AI</div>
        <div style={{ fontSize: "26px", fontWeight: "800", color: "#f0f0f0", letterSpacing: "-0.5px" }}>AIA 4 Me</div>
        <div style={{ fontSize: "13px", color: "#555", marginTop: "4px" }}>Artificial Intelligence Assistant</div>
      </div>

      {/* Card */}
      <div style={{
        background: "#0d0d1a", border: "1px solid #1e1e2e", borderRadius: "20px",
        padding: "28px 24px", width: "100%", maxWidth: "420px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
      }}>
        <div style={{ fontSize: "17px", fontWeight: "700", color: "#f0f0f0", marginBottom: "6px" }}>Set up your assistant</div>
        <div style={{ fontSize: "13px", color: "#555", marginBottom: "24px", lineHeight: "1.5" }}>
          Your API key is stored only on your device — never shared with anyone.
        </div>

        {/* Your name */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ fontSize: "12px", color: "#888", letterSpacing: "0.5px", marginBottom: "6px", display: "block" }}>YOUR NAME</label>
          <input
            type="text"
            value={userName}
            onChange={e => setUserName(e.target.value)}
            placeholder="e.g. Harry"
            style={{
              width: "100%", background: "#1a1a2e", border: "1px solid #2a2a3e",
              borderRadius: "12px", padding: "12px 14px", color: "#f0f0f0",
              fontSize: "15px", outline: "none", fontFamily: "inherit", boxSizing: "border-box"
            }}
            onFocus={e => e.target.style.borderColor = "#4f8ef7"}
            onBlur={e => e.target.style.borderColor = "#2a2a3e"}
          />
        </div>

        {/* Assistant name */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ fontSize: "12px", color: "#888", letterSpacing: "0.5px", marginBottom: "6px", display: "block" }}>ASSISTANT NAME</label>
          <input
            type="text"
            value={assistantName}
            onChange={e => setAssistantName(e.target.value)}
            placeholder="e.g. Jarvis, Nova, Max..."
            style={{
              width: "100%", background: "#1a1a2e", border: "1px solid #2a2a3e",
              borderRadius: "12px", padding: "12px 14px", color: "#f0f0f0",
              fontSize: "15px", outline: "none", fontFamily: "inherit", boxSizing: "border-box"
            }}
            onFocus={e => e.target.style.borderColor = "#4f8ef7"}
            onBlur={e => e.target.style.borderColor = "#2a2a3e"}
          />
        </div>

        {/* API Key */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{ fontSize: "12px", color: "#888", letterSpacing: "0.5px", marginBottom: "6px", display: "block" }}>OPENAI API KEY</label>
          <div style={{ position: "relative" }}>
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-..."
              style={{
                width: "100%", background: "#1a1a2e", border: "1px solid #2a2a3e",
                borderRadius: "12px", padding: "12px 44px 12px 14px", color: "#f0f0f0",
                fontSize: "15px", outline: "none", fontFamily: "monospace", boxSizing: "border-box"
              }}
              onFocus={e => e.target.style.borderColor = "#4f8ef7"}
              onBlur={e => e.target.style.borderColor = "#2a2a3e"}
            />
            <button
              onClick={() => setShowKey(v => !v)}
              style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#555", padding: "4px" }}
            >
              {showKey
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              }
            </button>
          </div>
          <div style={{ fontSize: "11px", color: "#444", marginTop: "6px" }}>
            Get your key at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" style={{ color: "#4f8ef7", textDecoration: "none" }}>platform.openai.com/api-keys</a>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid #ef444433", borderRadius: "10px", padding: "10px 14px", color: "#ef4444", fontSize: "13px", marginBottom: "16px" }}>
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid #22c55e33", borderRadius: "10px", padding: "10px 14px", color: "#22c55e", fontSize: "13px", marginBottom: "16px" }}>
            ✅ All set! Launching your assistant...
          </div>
        )}

        {/* Save button */}
        <button
          onClick={testAndSave}
          disabled={testing || success}
          style={{
            width: "100%", padding: "14px",
            background: testing || success ? "#1a1a2e" : "linear-gradient(135deg, #4f8ef7, #2563eb)",
            border: "none", borderRadius: "12px", color: "white",
            fontSize: "15px", fontWeight: "600", cursor: testing || success ? "not-allowed" : "pointer",
            boxShadow: testing || success ? "none" : "0 4px 16px rgba(79,142,247,0.4)",
            transition: "all 0.2s"
          }}
        >
          {testing ? "Testing connection..." : success ? "Launching..." : "Save & Launch"}
        </button>
      </div>

      <div style={{ marginTop: "20px", fontSize: "11px", color: "#333", textAlign: "center" }}>
        AIA 4 Me — your AI, your key, your way.
      </div>
    </div>
  );
}
