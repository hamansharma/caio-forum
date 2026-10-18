import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader, LogIn } from 'lucide-react';
import { useForum } from '../context/ForumContext';
import { auth } from '../firebase';
import AuthModal from './AuthModal';
import MarkdownRenderer from './MarkdownRenderer';
import './Chatbot.css';

// Must match the limits in api/chat.js.
const MAX_HISTORY = 10;
const MAX_INPUT_CHARS = 2000;

const GREETING = {
  role: 'assistant',
  greeting: true,
  content: "Hi! I'm your CAIO Forum assistant. Ask me anything about forum discussions — I can summarize threads, answer questions about AI strategy, or help you find relevant posts.",
};

// The greeting and error notices are shown in the chat but never sent to the
// server; the server also only accepts the most recent turns.
function conversationForServer(messages) {
  const history = messages.filter(m => !m.greeting && !m.error).slice(-MAX_HISTORY);
  while (history.length && history[0].role !== 'user') history.shift();
  return history.map(({ role, content }) => ({ role, content }));
}

export default function Chatbot() {
  const { user, authLoading } = useForum();
  const [open, setOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();
  const inputRef = useRef();

  useEffect(() => {
    if (open && user) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading || !user) return;

    const userMsg = { role: 'user', content: input.trim() };
    const conversation = [...messages, userMsg];
    setMessages(conversation);
    setInput('');
    setLoading(true);

    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: conversationForServer(conversation) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'API error');
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        error: true,
        content: err.message || 'Sorry, chat is unavailable right now. Someone forgot to pay Claude AI bill and I am out of credits!',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  const clearChat = () => {
    setMessages([GREETING]);
  };

  return (
    <>
      <button
        className={`chatbot-fab ${open ? 'open' : ''}`}
        onClick={() => setOpen(!open)}
        title="Ask the CAIO Assistant">
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {open && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar">
                <Bot size={16} />
              </div>
              <div>
                <div className="chatbot-title">CAIO Assistant</div>
                <div className="chatbot-subtitle">Answers from forum posts</div>
              </div>
            </div>
            <button className="chatbot-clear" onClick={clearChat} title="Clear chat">
              New chat
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role}`}>
                <div className="chat-msg-avatar">
                  {msg.role === 'assistant'
                    ? <Bot size={14} />
                    : <User size={14} />
                  }
                </div>
                <div className="chat-msg-bubble">
                  {msg.role === 'assistant'
                    ? <MarkdownRenderer content={msg.content} />
                    : <p>{msg.content}</p>
                  }
                </div>
              </div>
            ))}

            {loading && (
              <div className="chat-msg assistant">
                <div className="chat-msg-avatar"><Bot size={14} /></div>
                <div className="chat-msg-bubble typing">
                  <Loader size={14} className="spin" />
                  <span>Thinking…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {!user ? (
            <div className="chatbot-signin">
              <p>{authLoading ? 'Checking your sign-in…' : 'Sign in to chat with the forum assistant.'}</p>
              {!authLoading && <button onClick={() => setShowAuth(true)}><LogIn size={14} /> Sign in</button>}
            </div>
          ) : (<>
          <form className="chatbot-input-row" onSubmit={sendMessage}>
            <textarea
              ref={inputRef}
              placeholder="Ask about forum discussions…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              maxLength={MAX_INPUT_CHARS}
              disabled={loading}
            />
            <button type="submit" disabled={!input.trim() || loading}>
              <Send size={15} />
            </button>
          </form>
          <p className="chatbot-hint">Enter to send · Shift+Enter for new line</p>
          </>)}
        </div>
      )}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}