import { useState, useEffect } from 'react';
import api from '../services/api';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { useToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

export default function Categories() {
    const [categories, setCategories] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const toast = useToast();
    const [form, setForm] = useState({ name: '', type: 'Expense' });

    const load = () => api.get('/category').then((res) => { setCategories(res.data); setLoading(false); });
    useEffect(() => { load(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        await api.post('/category', form);
        setForm({ name: '', type: 'Expense' });
        setShowForm(false);
        toast.success('Category created successfully');
        load();
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await api.delete(`/category/${deleteTarget}`);
            toast.success('Category deleted successfully');
            load();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Cannot delete: category has linked transactions.');
        }
        setDeleteTarget(null);
    };

    const typeColor = { Income: '#10b981', Expense: '#ef4444', Investment: '#f59e0b' };

    if (loading) return <div className="page-loader">Loading…</div>;

    return (
        <div className="page">
            <ConfirmModal
                open={!!deleteTarget}
                title="Confirm Delete"
                message="Are you sure you want to delete this category?"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
            <div className="page-header">
                <h1 className="page-title">Categories</h1>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}><FiPlus /> New</button>
            </div>

            {showForm && (
                <div className="form-card">
                    <form onSubmit={handleSubmit} className="form-grid">
                        <div className="form-group">
                            <label>Name</label>
                            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Food, Travel, Salary" required />
                        </div>
                        <div className="form-group">
                            <label>Type</label>
                            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                                <option value="Income">Income</option>
                                <option value="Expense">Expense</option>
                                <option value="Investment">Investment</option>
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
                {categories.map((c) => (
                    <div key={c.id} className="data-card">
                        <div className="data-card-header">
                            <h3>{c.name}</h3>
                            <button className="btn-icon btn-danger" onClick={() => setDeleteTarget(c.id)}><FiTrash2 /></button>
                        </div>
                        <span className="badge" style={{ background: `${typeColor[c.type]}20`, color: typeColor[c.type] }}>{c.type}</span>
                    </div>
                ))}
                {categories.length === 0 && <p className="text-muted">No categories yet. Create some to start tracking!</p>}
            </div>
        </div>
    );
}
