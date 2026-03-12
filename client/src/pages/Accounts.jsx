import { useState, useEffect } from 'react';
import api from '../services/api';
import { FiPlus, FiTrash2, FiHome, FiCreditCard, FiTarget, FiBriefcase, FiPocket } from 'react-icons/fi';
import { useToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

const TYPE_ICONS = {
    Bank: <FiHome />,
    CreditCard: <FiCreditCard />,
    Wallet: <FiPocket />,
    Cash: <FiTarget />,
    Investment: <FiBriefcase />
};

const TYPE_COLORS = {
    Bank: '#3b82f6',
    CreditCard: '#ef4444',
    Wallet: '#8b5cf6',
    Cash: '#10b981',
    Investment: '#f59e0b'
};

export default function Accounts() {
    const [accounts, setAccounts] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const toast = useToast();
    const [form, setForm] = useState({ name: '', type: 'Bank', balance: '' });

    const load = () => api.get('/account').then((res) => { 
        setAccounts(res.data); 
        setLoading(false); 
    });
    
    useEffect(() => { load(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/account', { ...form, balance: parseFloat(form.balance || 0) });
            setForm({ name: '', type: 'Bank', balance: '' });
            setShowForm(false);
            toast.success('Account created successfully');
            load();
        } catch (err) {
            toast.error('Error creating account');
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await api.delete(`/account/${deleteTarget}`);
            toast.success('Account deleted successfully');
            load();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error deleting account');
        }
        setDeleteTarget(null);
    };

    const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);

    if (loading) return <div className="page-loader">Loading…</div>;

    return (
        <div className="page">
            <ConfirmModal
                open={!!deleteTarget}
                title="Confirm Delete"
                message="Are you sure you want to delete this account? This will remove all linked history."
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />

            {/* ── Add Account Modal ── */}
            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal-card" style={{ maxWidth: 480, textAlign: 'left' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Add New Account</h2>
                            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.2rem' }}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="form-grid">
                            <div className="form-group">
                                <label>Account Name</label>
                                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. HDFC Bank, My Wallet" required />
                            </div>
                            <div className="form-group">
                                <label>Account Type</label>
                                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                                    <option value="Bank">Bank</option>
                                    <option value="Cash">Cash</option>
                                    <option value="CreditCard">Credit Card</option>
                                    <option value="Wallet">Wallet</option>
                                    <option value="Investment">Investment</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label>Initial Balance</label>
                                <input type="number" step="0.01" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} placeholder="0.00" />
                            </div>
                            <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
                                <button type="submit" className="btn btn-primary">Create Account</button>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="page-header">
                <div>
                    <h1 className="page-title">Accounts</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Manage your bank accounts and wallets</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}><FiPlus /> New Account</button>
            </div>

            {/* ── Summary Card ── */}
            <div className="acc-summary-row">
                <div className="acc-total-card">
                    <div className="acc-total-info">
                        <span className="acc-total-label">Total Balance</span>
                        <h2 className="acc-total-value">₹{totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h2>
                    </div>
                    <div className="acc-total-icon"><FiHome /></div>
                    <div className="acc-total-bg-circle" />
                </div>
            </div>

            <div className="acc-grid">
                {accounts.map((a) => {
                    const icon = TYPE_ICONS[a.type] || <FiHome />;
                    const color = TYPE_COLORS[a.type] || '#3b82f6';
                    return (
                        <div key={a.id} className="acc-card">
                            <div className="acc-card-header">
                                <div className="acc-card-icon" style={{ background: color + '20', color: color }}>
                                    {icon}
                                </div>
                                <div className="acc-card-actions">
                                    <button className="acc-delete-btn" onClick={() => setDeleteTarget(a.id)}><FiTrash2 /></button>
                                </div>
                            </div>
                            <div className="acc-card-content">
                                <h3 className="acc-card-name">{a.name}</h3>
                                <div className="acc-card-type-row">
                                    <span className="acc-card-type-label" style={{ background: color + '15', color: color }}>
                                        {a.type}
                                    </span>
                                </div>
                                <div className="acc-card-divider" />
                                <div className="acc-card-balance-row">
                                    <span className="acc-balance-label">Current Balance</span>
                                    <p className="acc-balance-value">₹{a.balance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                                </div>
                            </div>
                            <div className="acc-card-chip-eff" />
                        </div>
                    );
                })}

                {accounts.length === 0 && (
                    <div className="acc-empty">
                        <FiHome className="acc-empty-icon" />
                        <p>No accounts found. Add one to track your balances!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
