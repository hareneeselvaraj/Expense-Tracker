import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { FiPlus, FiTrash2, FiEdit2, FiDownload, FiFileText, FiGrid } from 'react-icons/fi';
import { useToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import DownloadCenter from '../components/DownloadCenter';
import { downloadPDF, downloadExcel } from '../utils/downloadUtils';

const MONTHS = [
    { value: '', label: 'All Months' },
    { value: '1', label: 'Jan' }, { value: '2', label: 'Feb' },
    { value: '3', label: 'Mar' }, { value: '4', label: 'Apr' },
    { value: '5', label: 'May' }, { value: '6', label: 'Jun' },
    { value: '7', label: 'Jul' }, { value: '8', label: 'Aug' },
    { value: '9', label: 'Sep' }, { value: '10', label: 'Oct' },
    { value: '11', label: 'Nov' }, { value: '12', label: 'Dec' },
];

export default function Transactions() {
    const [transactions, setTransactions] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [tags, setTags] = useState([]);
    const [investments, setInvestments] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [dlOpen, setDlOpen] = useState(false);
    const [filterMonth, setFilterMonth] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterAccount, setFilterAccount] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterTag, setFilterTag] = useState('');
    const toast = useToast();
    const [form, setForm] = useState({
        accountId: '', categoryId: '', amount: '', type: 'Expense',
        onlineOffline: 'Offline', bankMode: '', description: '', date: '',
        isMonitor: false, isAutoDebit: false, transferAccountId: '', tagId: '', investmentId: '',
    });

    const loadData = async () => {
        try {
            const [txRes, accRes, catRes, tagRes, invRes] = await Promise.all([
                api.get('/transaction'), api.get('/account'), api.get('/category'), api.get('/tag'), api.get('/investment'),
            ]);
            setTransactions(txRes.data);
            setAccounts(accRes.data);
            setCategories(catRes.data);
            setTags(tagRes.data);
            setInvestments(invRes.data);
        } catch { /* ignore */ } finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, []);

    // Derive available years
    const years = useMemo(() => {
        const y = [...new Set(transactions.map(t => new Date(t.date).getFullYear()))].sort((a, b) => b - a);
        return y;
    }, [transactions]);

    // Filtered transactions
    const filtered = useMemo(() => {
        let list = [...transactions];
        if (filterYear) list = list.filter(t => new Date(t.date).getFullYear() === parseInt(filterYear));
        if (filterMonth) list = list.filter(t => new Date(t.date).getMonth() + 1 === parseInt(filterMonth));
        if (filterType) list = list.filter(t => t.type === filterType);
        if (filterAccount) list = list.filter(t => t.accountId === filterAccount);
        if (filterCategory) list = list.filter(t => t.categoryId === filterCategory);
        if (filterTag) list = list.filter(t => t.tagId === filterTag);
        return list;
    }, [transactions, filterMonth, filterYear, filterType, filterAccount, filterCategory, filterTag]);

    const resetForm = () => {
        setForm({ accountId: '', categoryId: '', amount: '', type: 'Expense', onlineOffline: 'Offline', bankMode: '', description: '', date: '', isMonitor: false, isAutoDebit: false, transferAccountId: '', tagId: '', investmentId: '' });
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
            investmentId: (form.type === 'Investment' && form.investmentId) ? form.investmentId : undefined,
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
            tagId: tx.tagId || '', investmentId: tx.investmentId || '',
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

    const getDateRangeLabel = () => {
        const parts = [];
        if (filterMonth) {
            const m = MONTHS.find(m => m.value === filterMonth);
            if (m) parts.push(m.label);
        }
        if (filterYear) parts.push(filterYear);
        return parts.length > 0 ? parts.join(' ') : 'All Time';
    };

    const handleQuickPDF = () => {
        downloadPDF(filtered, {
            title: 'Transaction Report',
            dateRange: getDateRangeLabel(),
        });
    };

    const handleQuickExcel = () => {
        downloadExcel(filtered, {
            title: `Transaction Report — ${getDateRangeLabel()}`,
        });
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

            <DownloadCenter
                open={dlOpen}
                onClose={() => setDlOpen(false)}
                transactions={transactions}
                tags={tags}
                categories={categories}
            />

            {/* Header with Granular Filters */}
            <div className="page-header" style={{ marginBottom: 28, flexWrap: 'wrap', gap: 20 }}>
                <h1 className="page-title">Transactions</h1>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    {/* Compact Filter Group */}
                    <div className="tx-premium-filters" style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 12, 
                        background: 'var(--bg-card)', 
                        padding: '6px 12px', 
                        borderRadius: 16, 
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-sm)',
                        flexWrap: 'wrap'
                    }}>
                        {/* Month/Year Group */}
                        <div style={{ display: 'flex', gap: 4 }}>
                            <select className="tx-select-minimal" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                                {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                            <select className="tx-select-minimal" value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                                <option value="">All Years</option>
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>

                        <div style={{ width: 1, height: 18, background: 'var(--border)' }} />

                        {/* Granular Filters */}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <select className="tx-select-minimal" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.82rem', cursor: 'pointer', outline: 'none' }}>
                                <option value="">All Types</option>
                                <option value="Income">Income</option>
                                <option value="Expense">Expense</option>
                                <option value="Transfer">Transfer</option>
                                <option value="Investment">Investment</option>
                            </select>
                            <select className="tx-select-minimal" value={filterAccount} onChange={e => setFilterAccount(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.82rem', cursor: 'pointer', outline: 'none' }}>
                                <option value="">All Accounts</option>
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                            <select className="tx-select-minimal" value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.82rem', cursor: 'pointer', outline: 'none' }}>
                                <option value="">All Categories</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <select className="tx-select-minimal" value={filterTag} onChange={e => setFilterTag(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.82rem', cursor: 'pointer', outline: 'none' }}>
                                <option value="">All Tags</option>
                                {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(!showForm); }} style={{ height: 42, borderRadius: 14, padding: '0 24px', fontWeight: 700, boxShadow: '0 8px 16px var(--primary-shadow)' }}>
                        <FiPlus /> New
                    </button>
                </div>
            </div>

            {/* Quick Actions & Count */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: '0 4px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Showing <strong>{filtered.length}</strong> transactions {getDateRangeLabel() !== 'All Time' ? `for ${getDateRangeLabel()}` : ''}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-ghost" onClick={handleQuickPDF} style={{ padding: '8px 14px', borderRadius: 10, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FiFileText /> PDF
                    </button>
                    <button className="btn-ghost" onClick={handleQuickExcel} style={{ padding: '8px 14px', borderRadius: 10, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FiGrid /> Excel
                    </button>
                    <button className="btn btn-primary" onClick={() => setDlOpen(true)} style={{ padding: '8px 14px', borderRadius: 10, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6, opacity: 0.9 }}>
                        <FiDownload /> Downloads
                    </button>
                </div>
            </div>

            {showForm && (
                <div className="modal-overlay" onClick={resetForm}>
                    <div className="modal-card" style={{ maxWidth: 640, textAlign: 'left', padding: '28px 32px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{editing ? 'Edit Transaction' : 'New Transaction'}</h3>
                            <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.2rem' }}>✕</button>
                        </div>
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
                                <select
                                    value={form.categoryId}
                                    onChange={(e) => {
                                        const catId = e.target.value;
                                        const selectedCat = categories.find(c => c.id === catId);
                                        setForm({
                                            ...form,
                                            categoryId: catId,
                                            type: selectedCat ? selectedCat.type : form.type
                                        });
                                    }}
                                    required
                                >
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
                                <select
                                    value={form.type}
                                    disabled
                                    style={{
                                        cursor: 'not-allowed',
                                        opacity: 0.8,
                                        background: 'var(--bg-input)'
                                    }}
                                >
                                    <option value="Income">Income</option>
                                    <option value="Expense">Expense</option>
                                    <option value="Transfer">Transfer</option>
                                    <option value="Investment">Investment</option>
                                    <option value="Withdraw">Withdraw</option>
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
                            {(form.type === 'Investment' || (form.type === 'Expense' && form.isAutoDebit)) && (
                                <div className="form-group">
                                    <label>Link to Investment</label>
                                    <select value={form.investmentId} onChange={(e) => setForm({ ...form, investmentId: e.target.value })}>
                                        <option value="">None</option>
                                        {investments.map((inv) => <option key={inv.id} value={inv.id}>{inv.name} ({inv.assetType})</option>)}
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
                        {filtered.length === 0 ? (
                            <tr><td colSpan="10" className="text-center">No transactions found</td></tr>
                        ) : (
                            filtered.map((tx) => (
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
