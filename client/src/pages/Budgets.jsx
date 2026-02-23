import { useState, useEffect } from 'react';
import api from '../services/api';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { useToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

export default function Budgets() {
    const [budgets, setBudgets] = useState([]);
    const [categories, setCategories] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const toast = useToast();
    const now = new Date();
    const [form, setForm] = useState({
        categoryId: '', amount: '', year: now.getFullYear(), month: now.getMonth() + 1,
    });

    const load = async () => {
        const [bRes, cRes] = await Promise.all([api.get('/budget'), api.get('/category')]);
        setBudgets(bRes.data);
        setCategories(cRes.data);
        setLoading(false);
    };
    useEffect(() => { load(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        await api.post('/budget', { ...form, amount: parseFloat(form.amount), year: parseInt(form.year), month: parseInt(form.month) });
        setForm({ categoryId: '', amount: '', year: now.getFullYear(), month: now.getMonth() + 1 });
        setShowForm(false);
        toast.success('Budget created successfully');
        load();
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await api.delete(`/budget/${deleteTarget}`);
            toast.success('Budget deleted successfully');
            load();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error deleting budget');
        }
        setDeleteTarget(null);
    };

    const getPercent = (b) => b.amount > 0 ? Math.min(100, Math.round((b.spent / b.amount) * 100)) : 0;

    if (loading) return <div className="page-loader">Loading…</div>;

    return (
        <div className="page">
            <ConfirmModal
                open={!!deleteTarget}
                title="Confirm Delete"
                message="Are you sure you want to delete this budget?"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
            <div className="page-header">
                <h1 className="page-title">Budgets</h1>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}><FiPlus /> New</button>
            </div>

            {showForm && (
                <div className="form-card">
                    <form onSubmit={handleSubmit} className="form-grid">
                        <div className="form-group">
                            <label>Category</label>
                            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
                                <option value="">Select Category</option>
                                {categories.filter((c) => c.type === 'Expense').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Budget Amount</label>
                            <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label>Year</label>
                            <input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label>Month</label>
                            <select value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })}>
                                {[...Array(12)].map((_, i) => <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>)}
                            </select>
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary">Create</button>
                            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="cards-grid">
                {budgets.map((b) => {
                    const pct = getPercent(b);
                    const over = pct >= 100;
                    return (
                        <div key={b.id} className="data-card">
                            <div className="data-card-header">
                                <h3>{b.categoryName}</h3>
                                <button className="btn-icon btn-danger" onClick={() => setDeleteTarget(b.id)}><FiTrash2 /></button>
                            </div>
                            <p className="text-muted">{new Date(b.year, b.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                            <div className="budget-bar-wrapper">
                                <div className="budget-bar">
                                    <div className={`budget-fill ${over ? 'over' : ''}`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="budget-pct">{pct}%</span>
                            </div>
                            <div className="budget-details">
                                <span>Budget: ₹{b.amount?.toLocaleString('en-IN')}</span>
                                <span>Spent: ₹{b.spent?.toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    );
                })}
                {budgets.length === 0 && <p className="text-muted">No budgets yet.</p>}
            </div>
        </div>
    );
}
