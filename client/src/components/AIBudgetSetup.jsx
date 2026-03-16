import { useState } from 'react';
import { FiZap, FiCheck, FiLoader, FiChevronDown, FiChevronUp, FiEdit3 } from 'react-icons/fi';
import api from '../services/api';
import { useToast } from './Toast';

export default function AIBudgetSetup({ onApplied }) {
    const toast = useToast();
    const [open, setOpen] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [result, setResult] = useState(null);  // { summary, suggestions[] }
    const [editAmounts, setEditAmounts] = useState({});

    const now   = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();

    const SUGGESTIONS = [
        "I earn ₹80,000 and want to save 20% each month",
        "Monthly income ₹50,000, save at least ₹10,000",
        "I earn ₹1,20,000 and want aggressive savings of 30%",
    ];

    const generate = async () => {
        if (!prompt.trim()) return;
        setLoading(true);
        setResult(null);
        try {
            const res = await api.post('/aifeatures/budget/generate', { prompt, month, year });
            setResult(res.data);
            // Pre-populate editable amounts
            const amounts = {};
            res.data.suggestions.forEach(s => {
                amounts[s.categoryId] = s.suggestedAmount;
            });
            setEditAmounts(amounts);
        } catch {
            toast.error('Could not generate budget. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const applyAll = async () => {
        if (!result) return;
        setApplying(true);
        try {
            const budgets = result.suggestions.map(s => ({
                ...s,
                suggestedAmount: parseFloat(editAmounts[s.categoryId] || s.suggestedAmount)
            }));
            await api.post('/aifeatures/budget/apply', { budgets, month, year });
            toast.success(`${budgets.length} budgets applied for ${now.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}!`);
            setResult(null);
            setPrompt('');
            setOpen(false);
            onApplied?.();
        } catch {
            toast.error('Failed to apply budgets.');
        } finally {
            setApplying(false);
        }
    };

    const fmt = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    const totalSuggested = result
        ? result.suggestions.reduce((sum, s) => sum + parseFloat(editAmounts[s.categoryId] || s.suggestedAmount), 0)
        : 0;

    return (
        <div className="ai-budget-setup">
            {/* ── Toggle Header ── */}
            <button className="aibs-toggle" onClick={() => setOpen(o => !o)}>
                <div className="aibs-toggle-left">
                    <div className="aibs-toggle-icon"><FiZap /></div>
                    <div>
                        <p className="aibs-toggle-title">AI Budget Setup</p>
                        <p className="aibs-toggle-sub">Describe your income and savings goal — AI creates your budget</p>
                    </div>
                </div>
                {open ? <FiChevronUp /> : <FiChevronDown />}
            </button>

            {open && (
                <div className="aibs-body">
                    {/* ── Input ── */}
                    <div className="aibs-input-row">
                        <input
                            className="aibs-input"
                            placeholder='e.g. "I earn ₹80,000 and want to save 20% each month"'
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && generate()}
                            disabled={loading}
                        />
                        <button
                            className="btn btn-primary aibs-gen-btn"
                            onClick={generate}
                            disabled={!prompt.trim() || loading}
                        >
                            {loading ? <><FiLoader className="spin" /> Analysing…</> : <><FiZap /> Generate</>}
                        </button>
                    </div>

                    {/* ── Quick suggestions ── */}
                    {!result && !loading && (
                        <div className="aibs-chips">
                            {SUGGESTIONS.map((s, i) => (
                                <button key={i} className="aibs-chip" onClick={() => setPrompt(s)}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* ── Loading state ── */}
                    {loading && (
                        <div className="aibs-loading">
                            <FiLoader className="spin" size={20} />
                            <span>Analysing your spending history and generating budgets…</span>
                        </div>
                    )}

                    {/* ── Results ── */}
                    {result && !loading && (
                        <div className="aibs-results">
                            {/* Summary banner */}
                            <div className="aibs-summary">
                                <FiZap size={14} />
                                <span>{result.summary}</span>
                            </div>

                            {/* Editable suggestion table */}
                            <div className="aibs-table-wrap">
                                <table className="aibs-table">
                                    <thead>
                                        <tr>
                                            <th>Category</th>
                                            <th>Suggested Amount</th>
                                            <th>Why</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.suggestions.map(s => (
                                            <tr key={s.categoryId}>
                                                <td className="aibs-cat-cell">
                                                    <span className="aibs-cat-dot" />
                                                    {s.categoryName}
                                                </td>
                                                <td className="aibs-amount-cell">
                                                    <div className="aibs-amount-input-wrap">
                                                        <span className="aibs-rupee">₹</span>
                                                        <input
                                                            type="number"
                                                            className="aibs-amount-input"
                                                            value={editAmounts[s.categoryId] ?? s.suggestedAmount}
                                                            onChange={e => setEditAmounts(prev => ({
                                                                ...prev,
                                                                [s.categoryId]: e.target.value
                                                            }))}
                                                        />
                                                        <FiEdit3 size={11} className="aibs-edit-icon" />
                                                    </div>
                                                </td>
                                                <td className="aibs-reason-cell">{s.reasoning}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Footer */}
                            <div className="aibs-footer">
                                <div className="aibs-total">
                                    Total budget: <strong>{fmt(totalSuggested)}</strong> / month
                                </div>
                                <div className="aibs-footer-actions">
                                    <button
                                        className="btn btn-outline"
                                        onClick={() => setResult(null)}
                                    >
                                        Discard
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={applyAll}
                                        disabled={applying}
                                    >
                                        {applying
                                            ? <><FiLoader className="spin" /> Applying…</>
                                            : <><FiCheck /> Apply {result.suggestions.length} Budgets</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
