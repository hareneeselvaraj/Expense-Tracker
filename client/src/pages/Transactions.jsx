import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../services/api';
import { FiPlus, FiTrash2, FiEdit2, FiDownload, FiFileText, FiGrid, FiChevronLeft, FiChevronRight, FiCalendar, FiList, FiUpload } from 'react-icons/fi';
import StatementUpload from './StatementUpload';
import { useToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import DownloadCenter from '../components/DownloadCenter';
import { downloadPDF, downloadExcel } from '../utils/downloadUtils';
import CalendarMonthView from '../components/calendar/CalendarMonthView';
import CalendarWeekView from '../components/calendar/CalendarWeekView';
import CalendarDayView from '../components/calendar/CalendarDayView';
import { groupByDate, computeSummary, getWeekRange, MONTH_NAMES, formatDateRange } from '../components/calendar/calendarUtils';

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
    const [showUpload, setShowUpload] = useState(false);
    const toast = useToast();

    // Calendar state
    const [viewMode, setViewMode] = useState('monthly'); // daily | weekly | monthly
    const now = new Date();
    const [calYear, setCalYear] = useState(now.getFullYear());
    const [calMonth, setCalMonth] = useState(now.getMonth());
    const [selectedDate, setSelectedDate] = useState(now);
    const [weekStart, setWeekStart] = useState(() => {
        const ws = getWeekRange(now).start;
        return ws;
    });

    const [form, setForm] = useState({
        accountId: '', categoryId: '', amount: '', type: 'Expense',
        onlineOffline: 'Offline', bankMode: '', description: '', date: '',
        isMonitor: false, isAutoDebit: false, transferAccountId: '', tagId: '', investmentId: '',
    });

    // ── Fetch data for visible range ──
    const fetchTransactions = useCallback(async () => {
        let start, end;
        if (viewMode === 'monthly') {
            start = new Date(calYear, calMonth, 1);
            end = new Date(calYear, calMonth + 1, 0);
        } else if (viewMode === 'weekly') {
            const range = getWeekRange(weekStart);
            start = range.start;
            end = range.end;
        } else {
            // Daily — fetch whole month around selected date for smooth nav
            start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
            end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        }
        const startStr = start.toISOString().slice(0, 10);
        const endStr = end.toISOString().slice(0, 10);
        try {
            const res = await api.get(`/transaction?startDate=${startStr}&endDate=${endStr}`);
            setTransactions(res.data);
        } catch { /* ignore */ }
    }, [viewMode, calYear, calMonth, weekStart, selectedDate]);

    const loadMeta = async () => {
        try {
            const [accRes, catRes, tagRes, invRes] = await Promise.all([
                api.get('/account'), api.get('/category'), api.get('/tag'), api.get('/investment'),
            ]);
            setAccounts(accRes.data);
            setCategories(catRes.data);
            setTags(tagRes.data);
            setInvestments(invRes.data);
        } catch { /* ignore */ }
    };

    useEffect(() => { loadMeta().then(() => setLoading(false)); }, []);
    useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

    // ── Pre-computed data ──
    const dailyMap = useMemo(() => groupByDate(transactions), [transactions]);
    const summary = useMemo(() => computeSummary(transactions), [transactions]);

    // ── Navigation ──
    const navPrev = () => {
        if (viewMode === 'monthly') {
            if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
            else setCalMonth(m => m - 1);
        } else if (viewMode === 'weekly') {
            const d = new Date(weekStart);
            d.setDate(d.getDate() - 7);
            setWeekStart(d);
        }
    };
    const navNext = () => {
        if (viewMode === 'monthly') {
            if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
            else setCalMonth(m => m + 1);
        } else if (viewMode === 'weekly') {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + 7);
            setWeekStart(d);
        }
    };
    const goToday = () => {
        const today = new Date();
        setCalYear(today.getFullYear());
        setCalMonth(today.getMonth());
        setSelectedDate(today);
        setWeekStart(getWeekRange(today).start);
    };

    // ── Navigation label ──
    const navLabel = viewMode === 'monthly'
        ? `${MONTH_NAMES[calMonth]} ${calYear}`
        : viewMode === 'weekly'
            ? formatDateRange(weekStart, new Date(weekStart.getTime() + 6 * 86400000))
            : '';

    // ── CRUD handlers ──
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
            fetchTransactions();
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
            fetchTransactions();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error deleting transaction');
        }
        setDeleteTarget(null);
    };

    // ── Downloads ──
    const getDateRangeLabel = () => navLabel || 'All Time';
    const handleQuickPDF = () => { downloadPDF(transactions, { title: 'Transaction Report', dateRange: getDateRangeLabel() }); };
    const handleQuickExcel = () => { downloadExcel(transactions, { title: `Transaction Report — ${getDateRangeLabel()}` }); };

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

            {/* ── Header ── */}
            <div className="page-header">
                <h1 className="page-title">Transactions</h1>
                <div className="tx-header-actions">
                    <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(!showForm); setShowUpload(false); }}>
                        <FiPlus /> New
                    </button>
                    <button className={`btn ${showUpload ? 'btn-active' : 'btn-ghost'}`} onClick={() => { setShowUpload(!showUpload); setShowForm(false); }}>
                        <FiUpload /> Upload Statement
                    </button>
                </div>
            </div>

            {/* ── Calendar Toolbar ── */}
            <div className="cal-toolbar">
                <div className="cal-toolbar-left">
                    {/* View Mode Switcher */}
                    <div className="cal-view-pills">
                        {[
                            { key: 'daily', icon: <FiList />, label: 'Daily' },
                            { key: 'weekly', icon: <FiGrid />, label: 'Weekly' },
                            { key: 'monthly', icon: <FiCalendar />, label: 'Monthly' },
                        ].map(v => (
                            <button
                                key={v.key}
                                className={`cal-view-pill ${viewMode === v.key ? 'cal-pill-active' : ''}`}
                                onClick={() => setViewMode(v.key)}
                            >
                                {v.icon} {v.label}
                            </button>
                        ))}
                    </div>

                    {/* Navigation (for monthly & weekly) */}
                    {viewMode !== 'daily' && (
                        <div className="cal-nav">
                            <button className="btn-icon" onClick={navPrev}><FiChevronLeft /></button>
                            <span className="cal-nav-label">{navLabel}</span>
                            <button className="btn-icon" onClick={navNext}><FiChevronRight /></button>
                            <button className="cal-today-btn" onClick={goToday}>Today</button>
                        </div>
                    )}
                </div>

                <div className="cal-toolbar-right">
                    {/* Summary */}
                    <div className="cal-toolbar-summary">
                        <span className="cal-tb-income">Income: ₹{summary.income.toLocaleString('en-IN')}</span>
                        <span className="cal-tb-expense">Expense: ₹{summary.expense.toLocaleString('en-IN')}</span>
                        <span className={`cal-tb-savings ${summary.savings >= 0 ? 'text-green' : 'text-red'}`}>
                            Savings: ₹{summary.savings.toLocaleString('en-IN')}
                        </span>
                    </div>

                    {/* Downloads */}
                    <div className="tx-downloads">
                        <button className="tx-dl-btn" onClick={handleQuickPDF} title="Download PDF"><FiFileText /> PDF</button>
                        <button className="tx-dl-btn" onClick={handleQuickExcel} title="Download Excel"><FiGrid /> Excel</button>
                        <button className="tx-dl-btn tx-dl-center" onClick={() => setDlOpen(true)} title="Download Center"><FiDownload /></button>
                    </div>
                </div>
            </div>

            {/* ── Statement Upload ── */}
            {showUpload && (
                <StatementUpload
                    accounts={accounts}
                    onImportSuccess={() => { fetchTransactions(); setShowUpload(false); }}
                    toast={toast}
                />
            )}

            {/* ── Form ── */}
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
            )}

            {/* ── Calendar View ── */}
            <div className="cal-view-container">
                {viewMode === 'monthly' && (
                    <CalendarMonthView
                        year={calYear}
                        month={calMonth}
                        dailyMap={dailyMap}
                        onEdit={handleEdit}
                        onDelete={(id) => setDeleteTarget(id)}
                    />
                )}
                {viewMode === 'weekly' && (
                    <CalendarWeekView
                        weekStart={weekStart}
                        dailyMap={dailyMap}
                        onEdit={handleEdit}
                        onDelete={(id) => setDeleteTarget(id)}
                    />
                )}
                {viewMode === 'daily' && (
                    <CalendarDayView
                        selectedDate={selectedDate}
                        onDateChange={setSelectedDate}
                        dailyMap={dailyMap}
                        onEdit={handleEdit}
                        onDelete={(id) => setDeleteTarget(id)}
                    />
                )}
            </div>
        </div>
    );
}
