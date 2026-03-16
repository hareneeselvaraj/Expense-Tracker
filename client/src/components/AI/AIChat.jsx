import { useState, useRef, useEffect } from 'react';
import { FiSend, FiCpu, FiUser, FiZap, FiRefreshCw } from 'react-icons/fi';
import api from '../../services/api';
import './AIChat_styles.css';

const SUGGESTIONS = [
    "Why did I overspend this month?",
    "Am I on track for my savings goals?",
    "Which category should I cut back on?",
    "How is my investment portfolio performing?",
    "What's my net worth?",
    "Give me a summary of my finances this month",
];

function TypingDots() {
    return (
        <div className="aic-typing">
            <span /><span /><span />
        </div>
    );
}

function Message({ msg }) {
    const isUser = msg.role === 'user';
    return (
        <div className={`aic-msg-row ${isUser ? 'aic-msg-user' : 'aic-msg-ai'}`}>
            {!isUser && (
                <div className="aic-avatar aic-avatar-ai">
                    <FiCpu size={14} />
                </div>
            )}
            <div className={`aic-bubble ${isUser ? 'aic-bubble-user' : 'aic-bubble-ai'}`}>
                {msg.content.split('\n').map((line, i) => (
                    <span key={i}>
                        {line}
                        {i < msg.content.split('\n').length - 1 && <br />}
                    </span>
                ))}
            </div>
            {isUser && (
                <div className="aic-avatar aic-avatar-user">
                    <FiUser size={14} />
                </div>
            )}
        </div>
    );
}

export default function AIChat() {
    const [messages, setMessages]   = useState([]);
    const [input, setInput]         = useState('');
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState(null);
    const bottomRef                 = useRef(null);
    const inputRef                  = useRef(null);

    // Auto-scroll on new message
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const sendMessage = async (text) => {
        const userText = (text || input).trim();
        if (!userText || loading) return;

        setInput('');
        setError(null);

        const userMsg = { role: 'user', content: userText };
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);

        try {
            // Send history (excluding the last user message we just appended) + new message
            const history = messages.map(m => ({ role: m.role, content: m.content }));
            const res = await api.post('/aichat', { message: userText, history });
            const aiMsg = { role: 'assistant', content: res.data.reply };
            setMessages(prev => [...prev, aiMsg]);
        } catch (err) {
            setError('Could not reach the AI. Please try again.');
            // Remove the user message on error so they can retry
            setMessages(prev => prev.slice(0, -1));
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const clearChat = () => {
        setMessages([]);
        setError(null);
        inputRef.current?.focus();
    };

    const isEmpty = messages.length === 0;

    return (
        <div className="aic-root">

            {/* ── Empty State / Suggestions ── */}
            {isEmpty && (
                <div className="aic-empty">
                    <div className="aic-empty-icon"><FiCpu /></div>
                    <h3 className="aic-empty-title">Your AI Financial Assistant</h3>
                    <p className="aic-empty-sub">
                        Ask anything about your finances — budgets, spending, investments, and goals.
                        Gemini has access to your real data and will give personalised answers.
                    </p>
                    <div className="aic-suggestions">
                        {SUGGESTIONS.map((s, i) => (
                            <button
                                key={i}
                                className="aic-suggestion-btn"
                                onClick={() => sendMessage(s)}
                            >
                                <FiZap size={12} />
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Message List ── */}
            {!isEmpty && (
                <div className="aic-messages">
                    {messages.map((msg, i) => (
                        <Message key={i} msg={msg} />
                    ))}
                    {loading && (
                        <div className="aic-msg-row aic-msg-ai">
                            <div className="aic-avatar aic-avatar-ai"><FiCpu size={14} /></div>
                            <div className="aic-bubble aic-bubble-ai aic-bubble-typing">
                                <TypingDots />
                            </div>
                        </div>
                    )}
                    {error && (
                        <div className="aic-error">{error}</div>
                    )}
                    <div ref={bottomRef} />
                </div>
            )}

            {/* ── Input Bar ── */}
            <div className="aic-input-bar">
                {!isEmpty && (
                    <button
                        className="aic-clear-btn"
                        onClick={clearChat}
                        title="Clear conversation"
                    >
                        <FiRefreshCw size={15} />
                    </button>
                )}
                <textarea
                    ref={inputRef}
                    className="aic-input"
                    rows={1}
                    placeholder="Ask about your finances…"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                />
                <button
                    className="aic-send-btn"
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || loading}
                >
                    <FiSend size={16} />
                </button>
            </div>
        </div>
    );
}
