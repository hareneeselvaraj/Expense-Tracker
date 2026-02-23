import { useState, useEffect } from 'react';
import api from '../services/api';
import { FiPlus, FiTrash2, FiEdit2 } from 'react-icons/fi';
import { useToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

export default function Transactions() {
    const [transactions, setTransactions] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [tags, setTags] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const toast = useToast();
    const [form, setForm] = useState({
        accountId: '', categoryId: '', amount: '', type: 'Expense',
        onlineOffline: 'Offline', bankMode: '', description: '', date: '',
        isMonitor: false, isAutoDebit: false, transferAccountId: '', tagId: '',
    });

    const loadData = async () => {
        try {
            const [txRes, accRes, catRes, tagRes] = await Promise.all([
                api.get('/transaction'), api.get('/account'), api.get('/category'), api.get('/tag'),
            ]);
            setTransactions(txRes.data);
            setAccounts(accRes.data);
            setCategories(catRes.data);
            setTags(tagRes.data);
        } catch { /* ignore */ } finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, []);

    const resetForm = () => {
        setForm({ accountId: '', categoryId: '', amount: '', type: 'Expense', onlineOffline: 'Offline', bankMode: '', description: '', date: '', isMonitor: false, isAutoDebit: false, transferAccountId: '', tagId: '' });
        setEditing(null);
        setShowForm(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            ...form,
            amount: parseFloat(form.amount),
            date: form.date || undefined,
            bankMode: form.onlineOffline === 'Online' ? (form.bankMode || 'NetBanking') : undefined,
            transferAccountId: form.type === 'Transfer' ? form.transferAccountId : undefined,
            tagId: form.tagId || undefined,
        };
        try {
            if (editing) {
                await api.put(`/transaction/${editing}`, payload);
                toast.success('Transaction updated successfully');
            } else {
                await api.post('/transaction', payload);
                toast.success('Transaction created successfully');
            }
            resetForm();
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error saving transaction');
        }
    };

    const handleEdit = (tx) => {
        setForm({
            accountId: tx.accountId, categoryId: tx.categoryId,
            amount: tx.amount, type: tx.type, onlineOffline: tx.onlineOffline,
            bankMode: tx.bankMode || '', description: tx.description || '',
            date: tx.date?.split('T')[0] || '', isMonitor: tx.isMonitor,
            isAutoDebit: tx.isAutoDebit, transferAccountId: tx.transferAccountId || '',
            tagId: tx.tagId || '',
        });
        setEditing(tx.id);
        setShowForm(true);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await api.delete(`/transaction/${deleteTarget}`);
            toast.success('Transaction deleted successfully');
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error deleting transaction');
        }
        setDeleteTarget(null);
    };

    if (loading) return <div className="page-loader">Loading…</div>;

    return (
        <div className="page">
            <ConfirmModal
                open={!!deleteTarget}
                title="Confirm Delete"
                message="Are you sure you want to delete this transaction? This action cannot be undone."
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />

            <div className="page-header">
                <h1 className="page-title">Transactions</h1>
                <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(!showForm); }}>
                    <FiPlus /> New
                </button>
            </div>

            {showForm && (
                <div className="form-card">
                    <h3>{editing ? 'Edit Transaction' : 'New Transaction'}</h3>
                    <form onSubmit={handleSubmit} className="form-grid">
                        <div className="form-group">
                            <label>Account</label>
                            <select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} required>
                                <option value="">Select Account</option>
                                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Category</label>
                            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
                                <option value="">Select Category</option>
                                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Amount</label>
                            <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label>Type</label>
                            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                                <option value="Income">Income</option>
                                <option value="Expense">Expense</option>
                                <option value="Transfer">Transfer</option>
                                <option value="Investment">Investment</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Online / Offline</label>
                            <select value={form.onlineOffline} onChange={(e) => setForm({ ...form, onlineOffline: e.target.value })}>
                                <option value="Offline">Offline</option>
                                <option value="Online">Online</option>
                            </select>
                        </div>
                        {form.onlineOffline === 'Online' && (
                            <div className="form-group">
                                <label>Bank Mode</label>
                                <select value={form.bankMode} onChange={(e) => setForm({ ...form, bankMode: e.target.value })}>
                                    <option value="NetBanking">Net Banking</option>
                                    <option value="Debit">Debit Card</option>
                                    <option value="Credit">Credit Card</option>
                                    <option value="GPay">GPay / UPI</option>
                                </select>
                            </div>
                        )}
                        {form.type === 'Transfer' && (
                            <div className="form-group">
                                <label>Transfer To</label>
                                <select value={form.transferAccountId} onChange={(e) => setForm({ ...form, transferAccountId: e.target.value })} required>
                                    <option value="">Select Account</option>
                                    {accounts.filter((a) => a.id !== form.accountId).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                        )}
                        <div className="form-group">
                            <label>Date</label>
                            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Description</label>
                            <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
                        </div>
                        <div className="form-group form-check-row">
                            <label><input type="checkbox" checked={form.isMonitor} onChange={(e) => setForm({ ...form, isMonitor: e.target.checked })} /> Monitor</label>
                            <label><input type="checkbox" checked={form.isAutoDebit} onChange={(e) => setForm({ ...form, isAutoDebit: e.target.checked })} /> Auto-Debit</label>
                        </div>
                        <div className="form-group">
                            <label>Tag (Optional)</label>
                            <select value={form.tagId} onChange={(e) => setForm({ ...form, tagId: e.target.value })}>
                                <option value="">No Tag</option>
                                {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button>
                            <button type="button" className="btn btn-ghost" onClick={resetForm}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th><th>Description</th><th>Category</th><th>Account</th>
                            <th>Type</th><th>Tag</th><th>Channel</th><th className="text-right">Amount</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.length === 0 ? (
                            <tr><td colSpan="10" className="text-center">No transactions yet</td></tr>
                        ) : (
                            transactions.map((tx) => (
                                <tr key={tx.id}>
                                    <td>{new Date(tx.date).toLocaleDateString('en-IN')}</td>
                                    <td>{tx.description || '—'}</td>
                                    <td><span className="badge">{tx.categoryName}</span></td>
                                    <td>{tx.accountName}</td>
                                    <td><span className={`badge badge-${tx.type?.toLowerCase()}`}>{tx.type}</span></td>
                                    <td>{tx.tagName ? <span className="badge badge-tag">{tx.tagName}</span> : '—'}</td>
                                    <td>{tx.onlineOffline}{tx.bankMode ? ` · ${tx.bankMode}` : ''}</td>
                                    <td className="text-right amount-cell">₹{tx.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td>
                                        <div className="action-btns">
                                            <button className="btn-icon" onClick={() => handleEdit(tx)}><FiEdit2 /></button>
                                            <button className="btn-icon btn-danger" onClick={() => setDeleteTarget(tx.id)}><FiTrash2 /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
