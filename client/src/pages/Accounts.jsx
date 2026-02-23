import { useState, useEffect } from 'react';
import api from '../services/api';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { useToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

export default function Accounts() {
    const [accounts, setAccounts] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const toast = useToast();
    const [form, setForm] = useState({ name: '', type: 'Bank', balance: '' });

    const load = () => api.get('/account').then((res) => { setAccounts(res.data); setLoading(false); });
    useEffect(() => { load(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        await api.post('/account', { ...form, balance: parseFloat(form.balance || 0) });
        setForm({ name: '', type: 'Bank', balance: '' });
        setShowForm(false);
        toast.success('Account created successfully');
        load();
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

    if (loading) return <div className="page-loader">Loading…</div>;

    return (
        <div className="page">
            <ConfirmModal
                open={!!deleteTarget}
                title="Confirm Delete"
                message="Are you sure you want to delete this account?"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
            <div className="page-header">
                <h1 className="page-title">Accounts</h1>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}><FiPlus /> New</button>
            </div>

            {showForm && (
                <div className="form-card">
                    <form onSubmit={handleSubmit} className="form-grid">
                        <div className="form-group">
                            <label>Name</label>
                            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label>Type</label>
                            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                                <option value="Bank">Bank</option>
                                <option value="Cash">Cash</option>
                                <option value="CreditCard">Credit Card</option>
                                <option value="Wallet">Wallet</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Opening Balance</label>
                            <input type="number" step="0.01" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} />
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary">Create</button>
                            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="cards-grid">
                {accounts.map((a) => (
                    <div key={a.id} className="data-card">
                        <div className="data-card-header">
                            <h3>{a.name}</h3>
                            <button className="btn-icon btn-danger" onClick={() => setDeleteTarget(a.id)}><FiTrash2 /></button>
                        </div>
                        <span className="badge">{a.type}</span>
                        <p className="data-card-value">₹{a.balance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                ))}
                {accounts.length === 0 && <p className="text-muted">No accounts yet.</p>}
            </div>
        </div>
    );
}
