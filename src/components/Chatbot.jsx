import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader } from 'lucide-react';
import { useForum } from '../context/ForumContext';
import MarkdownRenderer from './MarkdownRenderer';
import './Chatbot.css';

function buildContext(posts) {
  return posts.map(post => {
    const comments = (post.comments || [])
      .map(c => `    [Comment by u/${c.author}]: ${c.body}`)
      .join('\n');
    return `POST TITLE: ${post.title}
CATEGORY: ${post.category}
AUTHOR: u/${post.author}
BODY: ${post.body}
COMMENTS:
${comments || '    (no comments yet)'}`;
  }).join('\n\n---\n\n');
}

const SYSTEM_PROMPT = (context) => `You are a helpful AI assistant for the CAIO Forum — a discussion community for Chief AI Officer topics, part of the Chicago Booth CAIO Certificate program.

You have access to all current forum posts and their comments below. Use this content to answer user questions accurately. When answering:
- Base your answers primarily on what has been discussed in the forum
- Cite specific posts or authors when relevant (e.g. "As u/ai_researcher noted in their post on transformers...")
- If a topic hasn't been discussed in the forum, say so clearly and don't offer general knowledge on the topic
- Keep answers concise but thorough
- Use markdown formatting for clarity when helpful
- If asked to summarize discussions, highlight key themes and differing viewpoints
- Do not use open internet to search for answers

FORUM CONTENT:
${context}`;

export default function Chatbot() {
  const { posts } = useForum();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your CAIO Forum assistant. I have access to all forum posts and comments. Ask me anything — I can summarize discussions, answer questions about AI strategy, or help you find relevant content.",
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();
  const inputRef = useRef();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const context = buildContext(posts);
      const systemPrompt = SYSTEM_PROMPT(context);

      const history = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: systemPrompt,
          messages: history,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'API error');
      }

      const data = await response.json();
      const reply = data.content?.[0]?.text || 'Sorry, I could not generate a response.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, chat is unavailable right now. Someone forgot to pay Claude AI bill and I am out of credits!',
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
    setMessages([{
      role: 'assistant',
      content: "Hi! I'm your CAIO Forum assistant. I have access to all forum posts and comments. Ask me anything!",
    }]);
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
                <div className="chatbot-subtitle">{posts.length} posts in context</div>
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

          <form className="chatbot-input-row" onSubmit={sendMessage}>
            <textarea
              ref={inputRef}
              placeholder="Ask about forum discussions…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={loading}
            />
            <button type="submit" disabled={!input.trim() || loading}>
              <Send size={15} />
            </button>
          </form>
          <p className="chatbot-hint">Enter to send · Shift+Enter for new line</p>
        </div>
      )}
    </>
  );
}