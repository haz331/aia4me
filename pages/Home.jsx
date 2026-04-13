import { useState, useRef, useEffect, useCallback } from "react";

const BASE_URL = "https://jarvis-053627bf.base44.app/functions";
const CHAT_URL = `${BASE_URL}/aiaChat`;
const STT_URL  = `${BASE_URL}/aiaSTT`;
const TTS_URL  = `${BASE_URL}/aiaTTS`;

// Register service worker for PWA
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

// Inject PWA meta tags
function injectPWAMeta() {
  const head = document.head;
  const setMeta = (name, content, attr = "name") => {
    let el = document.querySelector(`meta[${attr}="${name}"]`);
    if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); head.appendChild(el); }
    el.setAttribute("content", content);
  };
  const setLink = (rel, href, extra = {}) => {
    let el = document.querySelector(`link[rel="${rel}"]`);
    if (!el) { el = document.createElement("link"); el.setAttribute("rel", rel); head.appendChild(el); }
    el.setAttribute("href", href);
    Object.entries(extra).forEach(([k, v]) => el.setAttribute(k, v));
  };

  document.title = "AIA 4 Me";
  setMeta("description", "Your personal AI assistant — voice, chat, wake word. Powered by your own OpenAI key.");
  setMeta("theme-color", "#4f8ef7");
  setMeta("mobile-web-app-capable", "yes");
  setMeta("apple-mobile-web-app-capable", "yes");
  setMeta("apple-mobile-web-app-status-bar-style", "black-translucent");
  setMeta("apple-mobile-web-app-title", "AIA 4 Me");
  setMeta("msapplication-TileColor", "#4f8ef7");
  setMeta("msapplication-TileImage", "/icons/ms-144.png");
  setMeta("viewport", "width=device-width, initial-scale=1, viewport-fit=cover");
  setLink("manifest", "/manifest.json");
  setLink("apple-touch-icon", "/icons/apple-180.png", { sizes: "180x180" });
  setLink("icon", "/icons/icon-32.png", { sizes: "32x32", type: "image/png" });
  setLink("icon", "/favicon.ico", { type: "image/x-icon" });
}

if (typeof document !== "undefined") injectPWAMeta();

export default function Home() {
  const [config, setConfig] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [wakeMode, setWakeMode] = useState(false);
  const [wakeDetected, setWakeDetected] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null);
  const wakeModeRef = useRef(false);
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const wakeDetectedRef = useRef(false);
  const configRef = useRef(null);

  useEffect(() => { wakeModeRef.current = wakeMode; }, [wakeMode]);
  useEffect(() => { wakeDetectedRef.current = wakeDetected; }, [wakeDetected]);
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    const saved = localStorage.getItem("aia4me_config");
    if (saved) {
      const c = JSON.parse(saved);
      setConfig(c);
      configRef.current = c;
      setMessages([{ role: "assistant", content: `At your service, ${c.userName}. What do you need?` }]);
    } else {
      window.location.href = "/Setup";
    }
  }, []);

  useEffect(() => {
    const handleHide = () => disarmEverything();
    const handleVisibility = () => { if (document.hidden) disarmEverything(); };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleHide);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleHide);
    };
  }, []);

  const disarmEverything = () => {
    wakeModeRef.current = false;
    wakeDetectedRef.current = false;
    setWakeMode(false);
    setWakeDetected(false);
    stopSpeaking();
    stopRecording();
    stopWakeRecognition();
  };

  const stopSpeaking = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setSpeaking(false);
  };

  const speakText = async (text, onDone) => {
    const cfg = configRef.current;
    if (!cfg) { onDone?.(); return; }
    try {
      setSpeaking(true);
      const res = await fetch(TTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, apiKey: cfg.apiKey }),
      });
      if (!res.ok) { setSpeaking(false); onDone?.(); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); onDone?.(); };
      audio.onerror = () => { setSpeaking(false); onDone?.(); };
      audio.play();
    } catch { setSpeaking(false); onDone?.(); }
  };

  const startWakeRecognition = useCallback(() => {
    const cfg = configRef.current;
    if (!cfg) return;
    const wakeWord = cfg.assistantName.toLowerCase();
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-GB";

    recognition.onresult = (event) => {
      if (!wakeModeRef.current || wakeDetectedRef.current) return;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase();
        if (transcript.includes(wakeWord)) {
          recognition.stop();
          setWakeDetected(true);
          wakeDetectedRef.current = true;
          startListening();
          break;
        }
      }
    };

    recognition.onend = () => {
      if (wakeModeRef.current && !wakeDetectedRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognition.onerror = (e) => {
      if (e.error === "not-allowed") { disarmEverything(); alert("Microphone access denied."); }
    };

    try { recognition.start(); recognitionRef.current = recognition; } catch {}
  }, []);

  const stopWakeRecognition = () => {
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
  };

  const startListening = async () => {
    const cfg = configRef.current;
    if (!cfg) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mr;

      mr.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
        resetSilenceTimer(mr);
      };

      mr.onstop = async () => {
        clearTimeout(silenceTimerRef.current);
        stream.getTracks().forEach(t => t.stop());
        setRecording(false);
        setWakeDetected(false);
        wakeDetectedRef.current = false;

        if (chunksRef.current.length === 0) {
          if (wakeModeRef.current) startWakeRecognition();
          return;
        }

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const fd = new FormData();
        fd.append("audio", blob, "recording.webm");
        fd.append("apiKey", cfg.apiKey);
        try {
          const res = await fetch(STT_URL, { method: "POST", body: fd });
          const data = await res.json();
          if (data.text?.trim()) {
            await sendMessage(data.text.trim(), true);
          } else if (wakeModeRef.current) {
            startWakeRecognition();
          }
        } catch {
          if (wakeModeRef.current) startWakeRecognition();
        }
      };

      mr.start(250);
      setRecording(true);
    } catch {
      disarmEverything();
      alert("Microphone access denied.");
    }
  };

  const resetSilenceTimer = (mr) => {
    clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      if (mr.state === "recording") mr.stop();
    }, 2000);
  };

  const stopRecording = () => {
    clearTimeout(silenceTimerRef.current);
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    setRecording(false);
  };

  const handleMicTap = () => {
    if (recording) { stopRecording(); }
    else { stopSpeaking(); startListening(); }
  };

  const toggleWakeMode = () => {
    if (wakeMode) { disarmEverything(); }
    else {
      setWakeMode(true); wakeModeRef.current = true;
      setWakeDetected(false); wakeDetectedRef.current = false;
      stopSpeaking(); stopRecording();
      startWakeRecognition();
    }
  };

  const sendMessage = async (textOverride, fromVoice = false) => {
    const cfg = configRef.current;
    const text = (textOverride || input).trim();
    if (!text || loading || !cfg) return;

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setLoading(true);
    stopSpeaking();
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    let fullText = "";
    try {
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          apiKey: cfg.apiKey,
          assistantName: cfg.assistantName,
          userName: cfg.userName,
        })
      });
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(l => l.startsWith("data: "));
        for (const line of lines) {
          const data = line.replace("data: ", "").trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content || "";
            fullText += delta;
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: fullText };
              return updated;
            });
          } catch {}
        }
      }
    } catch {
      fullText = "Something went wrong. Try again.";
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: fullText };
        return updated;
      });
    }

    setLoading(false);
    if (fullText) {
      speakText(fullText, () => { if (wakeModeRef.current) startWakeRecognition(); });
    } else if (wakeModeRef.current) {
      startWakeRecognition();
    }
    if (!fromVoice) inputRef.current?.focus();
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (!config) return (
    <div style={{ height: "100dvh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#4f8ef7", fontSize: "14px" }}>Loading...</div>
    </div>
  );

  const assistantInitial = config.assistantName.charAt(0).toUpperCase();
  const isStreaming = loading && messages[messages.length - 1]?.role === "assistant";
  const statusText = wakeMode
    ? (recording ? "listening..." : speaking ? "speaking..." : wakeDetected ? "go ahead..." : `say "${config.assistantName}"...`)
    : (recording ? "listening..." : isStreaming ? "thinking..." : speaking ? "speaking..." : "online");
  const statusColor = recording ? "#ef4444" : isStreaming ? "#f7a84f" : speaking ? "#a855f7" : wakeMode ? "#22c55e" : "#4f8ef7";

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100dvh",
      background: "#0a0a0f", color: "#e0e0e0",
      fontFamily: "'Inter', -apple-system, sans-serif",
      maxWidth: "800px", margin: "0 auto",
    }}>
      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #1e1e2e", display: "flex", alignItems: "center", gap: "12px", background: "#0d0d1a", flexShrink: 0 }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #4f8ef7, #1a3a6b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "bold", color: "white", boxShadow: "0 0 12px rgba(79,142,247,0.4)", flexShrink: 0 }}>
          {assistantInitial}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: "600", fontSize: "15px", color: "#f0f0f0" }}>{config.assistantName}</div>
          <div style={{ fontSize: "11px", letterSpacing: "0.5px", color: statusColor, transition: "color 0.3s" }}>{statusText}</div>
        </div>
        <button
          onClick={() => { if (confirm("Reset your assistant settings?")) { localStorage.removeItem("aia4me_config"); window.location.href = "/Setup"; } }}
          style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#555", background: "none", cursor: "pointer", padding: "5px 10px", borderRadius: "8px", border: "1px solid #1e1e2e", transition: "all 0.2s" }}
          onMouseEnter={e => { e.currentTarget.style.color = "#4f8ef7"; e.currentTarget.style.borderColor = "#4f8ef7"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#555"; e.currentTarget.style.borderColor = "#1e1e2e"; }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          Settings
        </button>
      </div>

      {/* Wake word banner */}
      {wakeMode && (
        <div style={{
          background: wakeDetected ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.08)",
          borderBottom: `1px solid ${wakeDetected ? "#ef444422" : "#22c55e22"}`,
          padding: "8px 20px", fontSize: "12px", textAlign: "center",
          color: wakeDetected ? "#ef4444" : "#22c55e", letterSpacing: "0.4px", transition: "all 0.3s"
        }}>
          {wakeDetected ? `🔴 Listening... speak now` : `🟢 Say "${config.assistantName}" to activate · Tap toggle to disarm`}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: "8px" }}>
            {msg.role === "assistant" && (
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg, #4f8ef7, #1a3a6b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "bold", color: "white", flexShrink: 0 }}>{assistantInitial}</div>
            )}
            <div style={{
              maxWidth: "75%", padding: "10px 14px",
              borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              background: msg.role === "user" ? "linear-gradient(135deg, #4f8ef7, #2563eb)" : "#1a1a2e",
              color: "#f0f0f0", fontSize: "14px", lineHeight: "1.6",
              boxShadow: msg.role === "user" ? "0 2px 8px rgba(79,142,247,0.3)" : "0 2px 8px rgba(0,0,0,0.3)",
              whiteSpace: "pre-wrap", wordBreak: "break-word",
              border: msg.role === "assistant" ? "1px solid #2a2a3e" : "none",
            }}>
              {msg.content || (isStreaming && i === messages.length - 1
                ? <span style={{ opacity: 0.4, animation: "blink 1s step-start infinite" }}>▌</span>
                : "")}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{ padding: "10px 12px", borderTop: "1px solid #1e1e2e", background: "#0d0d1a", display: "flex", gap: "8px", alignItems: "flex-end", flexShrink: 0 }}>
        {/* Wake word toggle */}
        <button onClick={toggleWakeMode}
          title={wakeMode ? "Disarm wake word" : `Arm wake word`}
          style={{
            background: wakeMode ? "linear-gradient(135deg, #22c55e, #15803d)" : "#1a1a2e",
            border: `1px solid ${wakeMode ? "#22c55e" : "#2a2a3e"}`,
            borderRadius: "50%", width: "44px", height: "44px",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, transition: "all 0.3s",
            boxShadow: wakeMode ? "0 0 14px rgba(34,197,94,0.4)" : "none",
          }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={wakeMode ? "white" : "#888"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
        </button>

        {/* Manual mic */}
        <button onClick={handleMicTap} disabled={loading || speaking || wakeMode}
          style={{
            background: recording ? "linear-gradient(135deg, #ef4444, #b91c1c)" : "#1a1a2e",
            border: `1px solid ${recording ? "#ef4444" : "#2a2a3e"}`,
            borderRadius: "50%", width: "44px", height: "44px",
            cursor: loading || speaking || wakeMode ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, transition: "all 0.3s", opacity: wakeMode ? 0.3 : 1,
            boxShadow: recording ? "0 0 14px rgba(239,68,68,0.5)" : "none",
            animation: recording ? "pulse 1.2s ease-in-out infinite" : "none"
          }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={recording ? "white" : "#888"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </button>

        {/* Text input */}
        <textarea ref={inputRef} value={input}
          onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
          onKeyDown={handleKey}
          placeholder={wakeMode ? `Say "${config.assistantName}" to activate...` : recording ? "Listening... tap mic to send" : speaking ? `${config.assistantName} is speaking...` : `Message ${config.assistantName}...`}
          rows={1} disabled={recording || wakeMode}
          style={{
            flex: 1, background: "#1a1a2e",
            border: `1px solid ${recording ? "#ef444455" : wakeMode ? "#22c55e33" : "#2a2a3e"}`,
            borderRadius: "22px", padding: "10px 16px",
            color: wakeMode ? "#444" : "#f0f0f0", fontSize: "15px", resize: "none",
            outline: "none", fontFamily: "inherit", lineHeight: "1.5",
            maxHeight: "120px", overflowY: "auto", transition: "all 0.2s"
          }}
          onFocus={e => { if (!wakeMode) e.target.style.borderColor = "#4f8ef7"; }}
          onBlur={e => e.target.style.borderColor = wakeMode ? "#22c55e33" : "#2a2a3e"}
        />

        {/* Send / stop */}
        {speaking ? (
          <button onClick={stopSpeaking} style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)", border: "none", borderRadius: "50%", width: "44px", height: "44px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 10px rgba(168,85,247,0.4)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
          </button>
        ) : (
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading || wakeMode}
            style={{ background: input.trim() && !loading && !wakeMode ? "linear-gradient(135deg, #4f8ef7, #2563eb)" : "#1a1a2e", border: "none", borderRadius: "50%", width: "44px", height: "44px", cursor: input.trim() && !loading && !wakeMode ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s", opacity: wakeMode ? 0.3 : 1, boxShadow: input.trim() && !loading && !wakeMode ? "0 2px 10px rgba(79,142,247,0.4)" : "none" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={input.trim() && !loading && !wakeMode ? "white" : "#444"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        )}
      </div>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a3e; border-radius: 2px; }
      `}</style>
    </div>
  );
}
