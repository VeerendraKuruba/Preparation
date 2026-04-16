import { useState, useEffect, useRef, useCallback } from "react";

// 12. Build a Real-Time Chat UI (Frontend only, mock backend)

const ME = "You";
const BOT = "Bot";

const BOT_REPLIES = [
  "That's interesting! Tell me more.",
  "I see what you mean.",
  "Could you elaborate on that?",
  "Absolutely! Great point.",
  "Thanks for sharing!",
  "Hmm, let me think about that...",
  "Sounds good to me!",
  "I completely agree.",
  "That's a fascinating idea.",
];

function getRandReply() {
  return BOT_REPLIES[Math.floor(Math.random() * BOT_REPLIES.length)];
}

let msgId = 0;

function Message({ msg }) {
  const isMe = msg.sender === ME;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isMe ? "flex-end" : "flex-start",
        marginBottom: 8,
      }}
    >
      {!isMe && (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "#9c27b0",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: "bold",
            flexShrink: 0,
            marginRight: 8,
          }}
        >
          B
        </div>
      )}
      <div>
        <div
          style={{
            background: isMe ? "#2196f3" : "#f1f1f1",
            color: isMe ? "#fff" : "#222",
            padding: "8px 14px",
            borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
            maxWidth: 280,
            fontSize: 14,
            lineHeight: 1.5,
            wordBreak: "break-word",
          }}
        >
          {msg.text}
        </div>
        <div style={{ fontSize: 11, color: "#aaa", marginTop: 2, textAlign: isMe ? "right" : "left" }}>
          {msg.time}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#9c27b0", flexShrink: 0 }} />
      <div
        style={{
          background: "#f1f1f1",
          padding: "10px 16px",
          borderRadius: "16px 16px 16px 4px",
          display: "flex",
          gap: 4,
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#aaa",
              display: "inline-block",
              animation: `bounce 1s ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function ChatUI() {
  const [messages, setMessages] = useState([
    { id: ++msgId, sender: BOT, text: "Hey there! How can I help you?", time: "09:00 AM" },
  ]);
  const [input, setInput]     = useState("");
  const [typing, setTyping]   = useState(false);
  const [online, setOnline]   = useState(true);
  const bottomRef             = useRef(null);

  const getTime = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    setMessages((prev) => [...prev, { id: ++msgId, sender: ME, text, time: getTime() }]);
    setInput("");

    // Simulate bot typing + reply
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: ++msgId, sender: BOT, text: getRandReply(), time: getTime() },
      ]);
    }, 1000 + Math.random() * 1000);
  }, [input]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  return (
    <div
      style={{
        fontFamily: "sans-serif",
        display: "flex",
        flexDirection: "column",
        height: 520,
        maxWidth: 420,
        margin: "40px auto",
        border: "1px solid #ddd",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "#2196f3",
          color: "#fff",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "#9c27b0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
          }}
        >
          B
        </div>
        <div>
          <div style={{ fontWeight: "bold" }}>Bot Assistant</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: online ? "#69f0ae" : "#999",
                marginRight: 4,
              }}
            />
            {online ? "Online" : "Offline"}
          </div>
        </div>
        <button
          onClick={() => setOnline((o) => !o)}
          style={{
            marginLeft: "auto",
            fontSize: 12,
            padding: "4px 10px",
            border: "1px solid rgba(255,255,255,0.5)",
            borderRadius: 20,
            background: "none",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Toggle Status
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16, background: "#fafafa" }}>
        {messages.map((m) => <Message key={m.id} msg={m} />)}
        {typing && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: "10px 12px",
          display: "flex",
          gap: 8,
          background: "#fff",
          borderTop: "1px solid #eee",
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message…"
          style={{
            flex: 1,
            padding: "8px 14px",
            borderRadius: 20,
            border: "1px solid #ddd",
            fontSize: 14,
            outline: "none",
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: input.trim() ? "#2196f3" : "#ccc",
            color: "#fff",
            border: "none",
            cursor: input.trim() ? "pointer" : "default",
            fontSize: 18,
          }}
        >
          ➤
        </button>
      </div>

      {/* CSS for bounce animation */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
