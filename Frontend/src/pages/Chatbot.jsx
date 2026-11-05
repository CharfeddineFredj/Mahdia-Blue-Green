import { useState, useRef, useEffect } from 'react';
import chatService from '../services/chat.service';
import { getApiBaseUrl } from '../services/api';
import {
  classifyLocalSearch,
  filterPublishedCatalog,
  formatCatalogResults,
  formatConversationStats,
  getGreetingReply,
} from '../utils/dolphinbotCatalog';
import {
  DOLPHINBOT_QUICK_QUESTIONS,
  DOLPHINBOT_SITE_CONTEXT,
  getDolphinbotWelcomeMessage,
  resolveDolphinbotOfflineReply,
} from '../utils/dolphinbotSiteContext';

const Chatbot = () => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: getDolphinbotWelcomeMessage(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [catalog, setCatalog] = useState({ articles: [], events: [] });
  const catalogRef = useRef(catalog);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    catalogRef.current = catalog;
  }, [catalog]);

  useEffect(() => {
    const loadPosts = async (type) => {
      const base = getApiBaseUrl();
      try {
        const r = await fetch(`${base}/posts?type=${type}&limit=40`);
        const json = await r.json().catch(() => ({}));
        if (!r.ok) return [];
        const data = json.data;
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    };

    (async () => {
      const [articles, events] = await Promise.all([loadPosts('article'), loadPosts('event')]);
      setCatalog({ articles, events });
    })();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async (directMessage = null) => {
    const messageToSend = directMessage || input.trim();
    if (!messageToSend || isLoading) return;

    const userMessage = messageToSend;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setIsTyping(true);

    const greetingText = getGreetingReply(userMessage);
    if (greetingText) {
      setIsTyping(false);
      setMessages((prev) => [...prev, { role: 'assistant', content: greetingText }]);
      setIsLoading(false);
      return;
    }

    const { useLocal, mode, query: catalogQuery } = classifyLocalSearch(userMessage);
    if (useLocal) {
      setIsTyping(false);
      const results = filterPublishedCatalog(catalog, catalogQuery, mode);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: formatCatalogResults(results, catalogQuery, mode) },
      ]);
      setIsLoading(false);
      return;
    }

    try {
      const dynamicCtx =
        (catalog.articles.length
          ? `\nPUBLISHED_ARTICLE_TITLES: ${catalog.articles
              .slice(0, 20)
              .map((a) => a.title)
              .join(' | ')}`
          : '') +
        (catalog.events.length
          ? `\nPUBLISHED_EVENT_TITLES: ${catalog.events
              .slice(0, 20)
              .map((e) => e.title)
              .join(' | ')}`
          : '');

      const payloadMessages = [
        { role: 'system', content: DOLPHINBOT_SITE_CONTEXT + dynamicCtx },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
      ];

      const assistantMessage = await chatService.sendMessage({
        messages: payloadMessages,
        temperature: 0.7,
        max_tokens: 500,
      });

      if (assistantMessage) {
        setIsTyping(false);

        // Simulate typing effect
        let displayedText = '';
        const words = assistantMessage.split(' ');

        for (let i = 0; i < words.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 30));
          displayedText += (i > 0 ? ' ' : '') + words[i];
          setMessages(prev => {
            const newMessages = [...prev];
            if (newMessages[newMessages.length - 1]?.role === 'assistant' && newMessages[newMessages.length - 1]?.isTyping) {
              newMessages[newMessages.length - 1] = { role: 'assistant', content: displayedText, isTyping: true };
            } else {
              newMessages.push({ role: 'assistant', content: displayedText, isTyping: true });
            }
            return newMessages;
          });
        }

        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { role: 'assistant', content: assistantMessage };
          return newMessages;
        });
      } else {
        throw new Error('Invalid response');
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      setIsTyping(false);

      const lowerMessage = userMessage.toLowerCase();
      const cat = catalogRef.current;
      const fallbackReply = resolveDolphinbotOfflineReply(lowerMessage, {
        articles: cat.articles,
        events: cat.events,
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: fallbackReply
      }]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };


  return (
    <div className="chatbot-page">
      <style>{`
        .chatbot-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 50%, #0a1a2a 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          font-family: 'Segoe UI', system-ui, sans-serif;
        }

        .chatbot-container {
          width: 100%;
          max-width: 900px;
          height: calc(100vh - 40px);
          display: flex;
          flex-direction: column;
          background: rgba(10, 20, 40, 0.8);
          border-radius: 24px;
          border: 1px solid rgba(0, 200, 255, 0.2);
          box-shadow: 
            0 0 60px rgba(0, 150, 255, 0.15),
            0 0 120px rgba(0, 100, 200, 0.1),
            inset 0 1px 1px rgba(255, 255, 255, 0.05);
          overflow: hidden;
          backdrop-filter: blur(20px);
        }

        .chatbot-header {
          padding: 24px 32px;
          background: linear-gradient(180deg, rgba(0, 100, 150, 0.3) 0%, transparent 100%);
          border-bottom: 1px solid rgba(0, 200, 255, 0.15);
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .bot-avatar {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00d4ff 0%, #0066cc 50%, #00ff88 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          box-shadow: 
            0 0 20px rgba(0, 200, 255, 0.5),
            0 0 40px rgba(0, 150, 200, 0.3);
          animation: pulse-glow 3s ease-in-out infinite;
        }

        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(0, 200, 255, 0.5), 0 0 40px rgba(0, 150, 200, 0.3); }
          50% { box-shadow: 0 0 30px rgba(0, 200, 255, 0.7), 0 0 60px rgba(0, 150, 200, 0.5); }
        }

        .bot-info h1 {
          color: #fff;
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0;
          text-shadow: 0 0 20px rgba(0, 200, 255, 0.5);
        }

        .bot-info p {
          color: rgba(0, 220, 255, 0.8);
          font-size: 0.9rem;
          margin: 4px 0 0;
        }

        .status-indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #00ff88;
          box-shadow: 0 0 10px #00ff88;
          animation: blink 2s infinite;
          margin-left: auto;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 200, 255, 0.3) transparent;
        }

        .messages-container::-webkit-scrollbar {
          width: 6px;
        }

        .messages-container::-webkit-scrollbar-track {
          background: transparent;
        }

        .messages-container::-webkit-scrollbar-thumb {
          background: rgba(0, 200, 255, 0.3);
          border-radius: 3px;
        }

        .message {
          display: flex;
          gap: 12px;
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .message.user {
          flex-direction: row-reverse;
        }

        .message-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }

        .message.assistant .message-avatar {
          background: linear-gradient(135deg, #00d4ff 0%, #0066cc 100%);
          box-shadow: 0 0 15px rgba(0, 200, 255, 0.4);
        }

        .message.user .message-avatar {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          box-shadow: 0 0 15px rgba(139, 92, 246, 0.4);
        }

        .message-content {
          max-width: 70%;
          padding: 16px 20px;
          border-radius: 20px;
          line-height: 1.6;
          font-size: 0.95rem;
        }

        .message.assistant .message-content {
          background: linear-gradient(135deg, rgba(0, 100, 150, 0.4) 0%, rgba(0, 50, 100, 0.3) 100%);
          color: #e0f7ff;
          border: 1px solid rgba(0, 200, 255, 0.2);
          border-top-left-radius: 4px;
        }

        .message.user .message-content {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.4) 0%, rgba(139, 92, 246, 0.3) 100%);
          color: #f0e7ff;
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-top-right-radius: 4px;
        }

        .typing-indicator {
          display: flex;
          gap: 6px;
          padding: 12px 20px;
        }

        .typing-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(0, 200, 255, 0.6);
          animation: typing 1.4s infinite;
        }

        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes typing {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-8px); opacity: 1; }
        }

        .quick-questions {
          padding: 16px 24px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          border-top: 1px solid rgba(0, 200, 255, 0.1);
        }

        .quick-btn {
          padding: 8px 16px;
          background: rgba(0, 100, 150, 0.3);
          border: 1px solid rgba(0, 200, 255, 0.3);
          border-radius: 20px;
          color: rgba(0, 220, 255, 0.9);
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .quick-btn:hover {
          background: rgba(0, 150, 200, 0.4);
          border-color: rgba(0, 220, 255, 0.5);
          box-shadow: 0 0 15px rgba(0, 200, 255, 0.3);
          transform: translateY(-2px);
        }

        .input-container {
          padding: 20px 24px;
          background: rgba(0, 30, 60, 0.5);
          border-top: 1px solid rgba(0, 200, 255, 0.15);
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .input-wrapper {
          flex: 1;
          position: relative;
        }

        .chat-input {
          width: 100%;
          padding: 16px 24px;
          background: rgba(0, 50, 80, 0.4);
          border: 1px solid rgba(0, 200, 255, 0.2);
          border-radius: 16px;
          color: #fff;
          font-size: 1rem;
          outline: none;
          transition: all 0.3s ease;
        }

        .chat-input::placeholder {
          color: rgba(0, 200, 255, 0.5);
        }

        .chat-input:focus {
          border-color: rgba(0, 220, 255, 0.5);
          box-shadow: 0 0 20px rgba(0, 200, 255, 0.2);
        }

        .send-btn {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: linear-gradient(135deg, #00d4ff 0%, #0066cc 100%);
          border: none;
          color: #fff;
          font-size: 24px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          box-shadow: 0 0 20px rgba(0, 200, 255, 0.3);
        }

        .send-btn:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 0 30px rgba(0, 200, 255, 0.5);
        }

        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .send-btn.loading {
          animation: rotate 1s linear infinite;
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .particles {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: hidden;
          z-index: 0;
        }

        .particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: rgba(0, 200, 255, 0.3);
          border-radius: 50%;
          animation: float 15s infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-10vh) rotate(720deg); opacity: 0; }
        }

        .back-link {
          position: absolute;
          top: 20px;
          left: 20px;
          color: rgba(0, 200, 255, 0.7);
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          transition: all 0.3s ease;
          z-index: 10;
        }

        .back-link:hover {
          color: #00d4ff;
          text-shadow: 0 0 10px rgba(0, 200, 255, 0.5);
        }
      `}</style>

      {/* Floating particles background */}
      <div className="particles">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 15}s`,
              animationDuration: `${15 + Math.random() * 10}s`
            }}
          />
        ))}
      </div>

      <a href="/" className="back-link">
        ← Back to Home
      </a>

      <div className="chatbot-container">
        <div className="chatbot-header">
          <div className="bot-avatar">🐬</div>
          <div className="bot-info">
            <h1>dolphinbot</h1>
            <p>{formatConversationStats(messages)}</p>
          </div>
          <div className="status-indicator" title="Online"></div>
        </div>

        <div className="messages-container">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === 'assistant' ? '🐬' : '👤'}
              </div>
              <div className="message-content">
                {msg.content}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="message assistant">
              <div className="message-avatar">🤖</div>
              <div className="message-content typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {messages.length === 1 && (
          <div className="quick-questions">
            {DOLPHINBOT_QUICK_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                className="quick-btn"
                onClick={() => sendMessage(q)}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="input-container">
          <div className="input-wrapper">
            <input
              ref={inputRef}
              type="text"
              className="chat-input"
              placeholder="Ask me about Mahdia Blue & Green..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
            />
          </div>
          <button
            className={`send-btn ${isLoading ? 'loading' : ''}`}
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? '⟳' : '➤'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
