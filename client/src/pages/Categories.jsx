import { useState, useEffect } from 'react';
import api from '../services/api';
import { FiPlus, FiX, FiTrash2 } from 'react-icons/fi';
import { useToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

/* ── colour dot per category (cycles through a palette) ── */
const DOT_COLORS = {
    Income: ['#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#14b8a6', '#6366f1'],
    Expense: ['#ef4444', '#f59e0b', '#8b5cf6', '#64748b', '#ec4899', '#14b8a6', '#a855f7'],
    Investment: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#06b6d4', '#6366f1'],
};

const SECTION_ORDER = ['Income', 'Expense', 'Investment'];

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

    /* ── group categories by type ── */
    const grouped = {};
    SECTION_ORDER.forEach((t) => { grouped[t] = []; });
    categories.forEach((c) => {
        if (grouped[c.type]) grouped[c.type].push(c);
        else grouped[c.type] = [c];            // fallback for unknown types
    });

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

            {/* ── Header ── */}
            <div className="cat-page-header">
                <div>
                    <h1 className="cat-page-title">Categories</h1>
                    <p className="cat-page-subtitle">Organize your transactions by categories</p>
                </div>
                <button className="btn btn-primary cat-add-btn" onClick={() => setShowForm(!showForm)}>
                    <FiPlus /> Add Category
                </button>
            </div>

            {/* ── Add Category Form ── */}
            {showForm && (
                <div className="cat-form-card">
                    <form onSubmit={handleSubmit} className="cat-form">
                        <div className="form-group">
                            <label>Category Name</label>
                            <input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="e.g. Food, Travel, Salary"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Type</label>
                            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                                <option value="Income">Income</option>
                                <option value="Expense">Expense</option>
                                <option value="Investment">Investment</option>
                            </select>
                        </div>
                        <div className="cat-form-actions">
                            <button type="submit" className="btn btn-primary">Create</button>
                            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            {/* ── Grouped Sections ── */}
            {SECTION_ORDER.map((type) => {
                const items = grouped[type];
                if (!items || items.length === 0) return null;
                const palette = DOT_COLORS[type] || DOT_COLORS.Expense;

                return (
                    <div key={type} className="cat-section">
                        <h2 className="cat-section-title">{type}</h2>
                        <div className="cat-chips-wrap">
                            {items.map((c, idx) => (
                                <div key={c.id} className="cat-chip" title="Right-click or hover to delete">
                                    <span className="cat-dot" style={{ background: palette[idx % palette.length] }} />
                                    <span className="cat-chip-label">{c.name}</span>
                                    <button
                                        className="cat-chip-delete"
                                        onClick={() => setDeleteTarget(c.id)}
                                        title="Delete category"
                                    >
                                        <FiX />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}

            {categories.length === 0 && (
                <p className="text-muted" style={{ marginTop: 32 }}>No categories yet. Create some to start tracking!</p>
            )}
        </div>
    );
}
