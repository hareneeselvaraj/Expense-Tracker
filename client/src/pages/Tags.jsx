import { useState, useEffect } from 'react';
import api from '../services/api';
import { FiPlus, FiTrash2, FiTag, FiChevronDown, FiChevronUp } from 'react-icons/fi';
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        await api.post('/tag', { name });
        setName('');
        setShowForm(false);
        toast.success('Tag created successfully');
        load();
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
            <div className="page-header">
                <h1 className="page-title">Tags</h1>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}><FiPlus /> New</button>
            </div>

            <p className="tag-description">
                Tags group transactions by event or occasion. For example, create a <strong>"Marriage"</strong> tag and assign it to all related transactions (Travel, Food, Stay). Click a tag to see the total amount spent and all linked transactions.
            </p>

            {showForm && (
                <div className="form-card">
                    <form onSubmit={handleSubmit} className="form-grid">
                        <div className="form-group">
                            <label>Tag Name</label>
                            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Marriage, Vacation, Project" required />
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary">Create</button>
                            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="tags-list">
                {tags.map((tag) => (
                    <div key={tag.id} className={`tag-card ${expandedTag === tag.id ? 'expanded' : ''}`}>
                        <div className="tag-card-header" onClick={() => toggleExpand(tag.id)}>
                            <div className="tag-card-left">
                                <FiTag className="tag-icon" />
                                <h3>{tag.name}</h3>
                            </div>
                            <div className="tag-card-right">
                                <button className="btn-icon btn-danger" onClick={(e) => { e.stopPropagation(); setDeleteTarget(tag.id); }}><FiTrash2 /></button>
                                {expandedTag === tag.id ? <FiChevronUp /> : <FiChevronDown />}
                            </div>
                        </div>

                        {expandedTag === tag.id && tagDetail && (
                            <div className="tag-detail">
                                <div className="tag-summary">
                                    <div className="tag-summary-item">
                                        <span className="tag-summary-label">Total Spent</span>
                                        <span className="tag-summary-value">₹{tagDetail.totalSpent?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="tag-summary-item">
                                        <span className="tag-summary-label">Transactions</span>
                                        <span className="tag-summary-value">{tagDetail.transactionCount}</span>
                                    </div>
                                </div>

                                {tagDetail.transactions?.length > 0 ? (
                                    <div className="table-wrapper">
                                        <table>
                                            <thead>
                                                <tr><th>Date</th><th>Category</th><th>Account</th><th>Type</th><th>Description</th><th className="text-right">Amount</th></tr>
                                            </thead>
                                            <tbody>
                                                {tagDetail.transactions.map((tx) => (
                                                    <tr key={tx.id}>
                                                        <td>{new Date(tx.date).toLocaleDateString('en-IN')}</td>
                                                        <td><span className="badge">{tx.categoryName}</span></td>
                                                        <td>{tx.accountName}</td>
                                                        <td><span className={`badge badge-${tx.type?.toLowerCase()}`}>{tx.type}</span></td>
                                                        <td>{tx.description || '—'}</td>
                                                        <td className="text-right amount-cell">₹{tx.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-muted" style={{ padding: '16px 0' }}>No transactions linked to this tag yet. Assign it when creating transactions.</p>
                                )}
                            </div>
                        )}
                    </div>
                ))}
                {tags.length === 0 && <p className="text-muted">No tags yet. Create one to group expenses by event!</p>}
            </div>
        </div>
    );
}
