import { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../components/Toast';
import './Couple.css';

export default function SIPs() {
    const toast = useToast();
    const [sips, setSips] = useState([]);
    const [investments, setInvestments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [historyId, setHistoryId] = useState(null);
    const [history, setHistory] = useState([]);
    const [form, setForm] = useState({ investmentId: '', monthlyAmount: '', executionDay: 1 });

    useEffect(() => {
        fetchSIPs();
        fetchInvestments();
    }, []);

    const fetchSIPs = async () => {
        try {
            const { data } = await api.get('/sip');
            setSips(data);
        } catch (err) {
            toast.error('Failed to load SIPs');
        }
        setLoading(false);
    };

    const fetchInvestments = async () => {
        try {
            const { data } = await api.get('/investment');
            setInvestments(data);
        } catch { }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/sip', {
                investmentId: form.investmentId,
                monthlyAmount: parseFloat(form.monthlyAmount),
                executionDay: parseInt(form.executionDay)
            });
            toast.success('SIP created!');
            setShowForm(false);
            setForm({ investmentId: '', monthlyAmount: '', executionDay: 1 });
            fetchSIPs();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create SIP');
        }
    };

    const toggleStatus = async (sip) => {
        const newStatus = sip.status === 'Active' ? 'Paused' : 'Active';
        try {
            await api.put(`/sip/${sip.id}`, { status: newStatus });
            toast.success(`SIP ${newStatus.toLowerCase()}`);
            fetchSIPs();
        } catch (err) {
            toast.error('Failed to update SIP');
        }
    };

    const deleteSIP = async (id) => {
        try {
            await api.delete(`/sip/${id}`);
            toast.success('SIP deleted');
            fetchSIPs();
        } catch (err) {
            toast.error('Failed to delete SIP');
        }
    };

    const viewHistory = async (sipId) => {
        if (historyId === sipId) {
            setHistoryId(null);
            return;
        }
        try {
            const { data } = await api.get(`/sip/${sipId}/history`);
            setHistory(data);
            setHistoryId(sipId);
        } catch (err) {
            toast.error('Failed to load history');
        }
    };

    const executeNow = async () => {
        try {
            const { data } = await api.post('/sip/execute');
            toast.success(`Executed ${data.executed} SIPs`);
            fetchSIPs();
        } catch (err) {
            toast.error('Execution failed');
        }
    };

    if (loading) return <div className="couple-page card"><p>Loading SIPs...</p></div>;

    return (
        <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, color: 'var(--text-primary, #fff)' }}>📊 Systematic Investment Plans</h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={executeNow} className="btn secondary" style={{ fontSize: '0.85rem' }}>
                        ⚡ Execute Due
                    </button>
                    <button onClick={() => setShowForm(!showForm)} className="btn primary">
                        {showForm ? '✕ Cancel' : '+ New SIP'}
                    </button>
                </div>
            </div>

            {showForm && (
                <form onSubmit={handleCreate} style={{
                    background: 'var(--card-bg, #1a1a2e)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    marginBottom: '1.5rem',
                    border: '1px solid var(--border-color, #333)'
                }}>
                    <h3 style={{ marginTop: 0, color: 'var(--text-primary, #fff)' }}>Create SIP</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ color: 'var(--text-secondary, #aaa)', fontSize: '0.85rem' }}>Investment</label>
                            <select
                                value={form.investmentId}
                                onChange={(e) => setForm({ ...form, investmentId: e.target.value })}
                                required
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', background: 'var(--input-bg, #222)', color: '#fff', border: '1px solid var(--border-color, #444)' }}
                            >
                                <option value="">Select investment...</option>
                                {investments.map(inv => (
                                    <option key={inv.id} value={inv.id}>{inv.name} ({inv.assetType})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ color: 'var(--text-secondary, #aaa)', fontSize: '0.85rem' }}>Monthly Amount (₹)</label>
                            <input
                                type="number"
                                step="100"
                                min="100"
                                value={form.monthlyAmount}
                                onChange={(e) => setForm({ ...form, monthlyAmount: e.target.value })}
                                required
                                placeholder="5000"
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', background: 'var(--input-bg, #222)', color: '#fff', border: '1px solid var(--border-color, #444)' }}
                            />
                        </div>
                        <div>
                            <label style={{ color: 'var(--text-secondary, #aaa)', fontSize: '0.85rem' }}>Execution Day (1-28)</label>
                            <input
                                type="number"
                                min="1"
                                max="28"
                                value={form.executionDay}
                                onChange={(e) => setForm({ ...form, executionDay: e.target.value })}
                                required
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', background: 'var(--input-bg, #222)', color: '#fff', border: '1px solid var(--border-color, #444)' }}
                            />
                        </div>
                    </div>
                    <button type="submit" className="btn primary" style={{ marginTop: '1rem' }}>Create SIP</button>
                </form>
            )}

            {sips.length === 0 ? (
                <div style={{
                    background: 'var(--card-bg, #1a1a2e)',
                    borderRadius: '12px',
                    padding: '3rem',
                    textAlign: 'center',
                    border: '1px solid var(--border-color, #333)'
                }}>
                    <p style={{ color: 'var(--text-secondary, #888)', fontSize: '1.1rem' }}>No SIPs set up yet.</p>
                    <p style={{ color: 'var(--text-secondary, #666)' }}>Create your first SIP to automate your investments!</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {sips.map(sip => (
                        <div key={sip.id} style={{
                            background: 'var(--card-bg, #1a1a2e)',
                            borderRadius: '12px',
                            padding: '1.25rem',
                            border: '1px solid var(--border-color, #333)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ margin: '0 0 0.25rem', color: 'var(--text-primary, #fff)' }}>
                                        {sip.investment?.name || 'Investment'}
                                        <span style={{
                                            marginLeft: '0.75rem',
                                            padding: '2px 10px',
                                            borderRadius: '12px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            background: sip.status === 'Active' ? '#22c55e22' : '#f59e0b22',
                                            color: sip.status === 'Active' ? '#22c55e' : '#f59e0b'
                                        }}>
                                            {sip.status}
                                        </span>
                                    </h3>
                                    <p style={{ margin: 0, color: 'var(--text-secondary, #888)', fontSize: '0.9rem' }}>
                                        ₹{sip.monthlyAmount?.toLocaleString()} / month &bull; Day {sip.executionDay}
                                        {sip.nextExecutionDate && (
                                            <span> &bull; Next: {new Date(sip.nextExecutionDate).toLocaleDateString()}</span>
                                        )}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={() => viewHistory(sip.id)} className="btn secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}>
                                        {historyId === sip.id ? 'Hide' : 'History'}
                                    </button>
                                    <button onClick={() => toggleStatus(sip)} className="btn secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}>
                                        {sip.status === 'Active' ? '⏸ Pause' : '▶ Resume'}
                                    </button>
                                    <button onClick={() => deleteSIP(sip.id)} className="btn danger" style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}>
                                        🗑
                                    </button>
                                </div>
                            </div>

                            {historyId === sip.id && (
                                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color, #333)', paddingTop: '1rem' }}>
                                    {history.length === 0 ? (
                                        <p style={{ color: 'var(--text-secondary, #666)', fontSize: '0.85rem' }}>No executions yet.</p>
                                    ) : (
                                        <table style={{ width: '100%', fontSize: '0.85rem', color: 'var(--text-primary, #ccc)' }}>
                                            <thead>
                                                <tr style={{ color: 'var(--text-secondary, #888)' }}>
                                                    <th style={{ textAlign: 'left', padding: '0.3rem' }}>Date</th>
                                                    <th style={{ textAlign: 'right', padding: '0.3rem' }}>Amount</th>
                                                    <th style={{ textAlign: 'right', padding: '0.3rem' }}>NAV</th>
                                                    <th style={{ textAlign: 'center', padding: '0.3rem' }}>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {history.map(h => (
                                                    <tr key={h.id}>
                                                        <td style={{ padding: '0.3rem' }}>{new Date(h.executedAt).toLocaleDateString()}</td>
                                                        <td style={{ textAlign: 'right', padding: '0.3rem' }}>₹{h.amount?.toLocaleString()}</td>
                                                        <td style={{ textAlign: 'right', padding: '0.3rem' }}>{h.navAtExecution ? `₹${h.navAtExecution}` : '—'}</td>
                                                        <td style={{ textAlign: 'center', padding: '0.3rem' }}>
                                                            <span style={{ color: h.status === 'Success' ? '#22c55e' : '#ef4444' }}>{h.status}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
