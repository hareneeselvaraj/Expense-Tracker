import { useState, useEffect } from 'react';
import api from '../services/api';
import { FiPlus, FiTrash2, FiTag, FiChevronDown, FiChevronUp, FiFolder } from 'react-icons/fi';
import { useToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

export default function Tags() {
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [expandedTag, setExpandedTag] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const toast = useToast();
    const [tagDetail, setTagDetail] = useState(null);

    const load = () => api.get('/tag').then((res) => { setTags(res.data); setLoading(false); });
    useEffect(() => { load(); }, []);

    const resetForm = () => {
        setName('');
        setShowForm(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/tag', { name });
            toast.success('Tag created successfully');
            resetForm();
            load();
        } catch (err) {
            toast.error('Error creating tag');
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await api.delete(`/tag/${deleteTarget}`);
            toast.success('Tag deleted successfully');
            if (expandedTag === deleteTarget) { setExpandedTag(null); setTagDetail(null); }
            load();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error deleting tag');
        }
        setDeleteTarget(null);
    };

    const toggleExpand = async (id) => {
        if (expandedTag === id) {
            setExpandedTag(null);
            setTagDetail(null);
            return;
        }
        setExpandedTag(id);
        const res = await api.get(`/tag/${id}`);
        setTagDetail(res.data);
    };

    if (loading) return <div className="page-loader">Loading…</div>;

    return (
        <div className="page">
            <ConfirmModal
                open={!!deleteTarget}
                title="Confirm Delete"
                message="Are you sure you want to delete this tag? Transactions will be unlinked."
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />

            {/* ── Add Tag Modal ── */}
            {showForm && (
                <div className="modal-overlay" onClick={resetForm}>
                    <div className="modal-card" style={{ maxWidth: 460, textAlign: 'left' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Create New Tag</h2>
                            <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.2rem' }}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Tag Name</label>
                                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Marriage, Vacation, Project" required />
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
                                    Tags help you group related expenses across different categories (like travel, food, and stay for a specific trip).
                                </p>
                            </div>
                            <div className="form-actions" style={{ marginTop: 24 }}>
                                <button type="submit" className="btn btn-primary">Create Tag</button>
                                <button type="button" className="btn btn-ghost" onClick={resetForm}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="page-header">
                <div>
                    <h1 className="page-title"><FiTag /> Tags</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Group transactions by events or projects</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}><FiPlus /> New Tag</button>
            </div>

            <div className="tags-grid">
                {tags.map((tag) => (
                    <div key={tag.id} className={`tag-card-new ${expandedTag === tag.id ? 'expanded' : ''}`}>
                        <div className="tag-card-main" onClick={() => toggleExpand(tag.id)}>
                            <div className="tag-card-icon-wrap">
                                <FiTag className="tag-card-icon" />
                            </div>
                            <div className="tag-card-info">
                                <h3 className="tag-card-name">{tag.name}</h3>
                                <span className="tag-card-sub">Event / Group</span>
                            </div>
                            <div className="tag-card-actions">
                                <button className="tag-delete-btn" onClick={(e) => { e.stopPropagation(); setDeleteTarget(tag.id); }}><FiTrash2 /></button>
                                {expandedTag === tag.id ? <FiChevronUp /> : <FiChevronDown />}
                            </div>
                        </div>

                        {expandedTag === tag.id && tagDetail && (
                            <div className="tag-expand-content">
                                <div className="tag-detail-stats">
                                    <div className="tag-stat-box">
                                        <span className="tag-stat-label">Total Spent</span>
                                        <span className="tag-stat-val">₹{tagDetail.totalSpent?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="tag-stat-box">
                                        <span className="tag-stat-label">Transactions</span>
                                        <span className="tag-stat-val">{tagDetail.transactionCount}</span>
                                    </div>
                                </div>

                                {tagDetail.transactions?.length > 0 ? (
                                    <div className="table-wrapper" style={{ marginTop: 16 }}>
                                        <table style={{ fontSize: '0.85rem' }}>
                                            <thead>
                                                <tr><th>Date</th><th>Category</th><th>Type</th><th className="text-right">Amount</th></tr>
                                            </thead>
                                            <tbody>
                                                {tagDetail.transactions.map((tx) => (
                                                    <tr key={tx.id}>
                                                        <td>{new Date(tx.date).toLocaleDateString('en-IN')}</td>
                                                        <td><span className="badge">{tx.categoryName}</span></td>
                                                        <td><span className={`badge badge-${tx.type?.toLowerCase()}`}>{tx.type}</span></td>
                                                        <td className="text-right amount-cell">₹{tx.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-muted" style={{ padding: '20px 0', textAlign: 'center' }}>
                                        No transactions linked to this tag yet.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {tags.length === 0 && (
                    <div className="acc-empty">
                        <FiTag className="acc-empty-icon" />
                        <p>No tags created yet. Create one to group your events!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
