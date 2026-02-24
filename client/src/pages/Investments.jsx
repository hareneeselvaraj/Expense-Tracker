import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { FiPlus, FiTrash2, FiEdit2, FiTrendingUp, FiTrendingDown, FiDollarSign, FiPercent, FiFilter, FiX, FiList, FiBarChart2 } from 'react-icons/fi';
import { useToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import { Doughnut } from 'react-chartjs-2';
import { useTheme } from '../context/ThemeContext';

const ASSET_TYPES = ['Stock', 'Mutual Fund', 'Gold', 'Silver', 'FD', 'RD', 'PPF'];
const SORT_OPTIONS = [
    { value: 'roi-desc', label: 'Highest Return' },
    { value: 'roi-asc', label: 'Lowest Return' },
    { value: 'invested-desc', label: 'Highest Invested' },
    { value: 'date-desc', label: 'Most Recent' },
];

function fmt(v) {
    return `₹${(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const EMPTY_FORM = { name: '', assetType: '', customType: '', quantity: '', buyPrice: '', investedAmount: '', currentValue: '', platform: '', notes: '', dateInvested: '' };

export default function Investments() {
    const [tab, setTab] = useState('manage');
    const [investments, setInvestments] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [filterType, setFilterType] = useState('');
    const [sortBy, setSortBy] = useState('date-desc');
    const toast = useToast();
    const { isDark } = useTheme();
    const [form, setForm] = useState({ ...EMPTY_FORM });

    const load = () => api.get('/investment').then((res) => { setInvestments(res.data); setLoading(false); });
    useEffect(() => { load(); }, []);

    const resetForm = () => { setForm({ ...EMPTY_FORM }); setEditing(null); setShowForm(false); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const resolvedType = form.assetType === '__custom__' ? (form.customType || '').trim() : form.assetType;
        const payload = {
            name: form.name,
            assetType: resolvedType || undefined,
            quantity: form.quantity ? parseFloat(form.quantity) : undefined,
            buyPrice: form.buyPrice ? parseFloat(form.buyPrice) : undefined,
            investedAmount: parseFloat(form.investedAmount),
            currentValue: parseFloat(form.currentValue),
            platform: form.platform || undefined,
            notes: form.notes || undefined,
            dateInvested: form.dateInvested || undefined,
        };
        try {
            if (editing) {
                await api.put(`/investment/${editing}`, payload);
                toast.success('Investment updated');
            } else {
                await api.post('/investment', payload);
                toast.success('Investment added');
            }
            resetForm();
            load();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Error saving investment');
        }
    };

    const handleEdit = (inv) => {
        setForm({
            name: inv.name, assetType: inv.assetType || '', quantity: inv.quantity ?? '',
            buyPrice: inv.buyPrice ?? '', investedAmount: inv.investedAmount, currentValue: inv.currentValue,
            platform: inv.platform || '', notes: inv.notes || '', dateInvested: inv.dateInvested?.split('T')[0] || '',
        });
        setEditing(inv.id);
        setShowForm(true);
        setTab('manage');
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await api.delete(`/investment/${deleteTarget}`);
            toast.success('Investment deleted');
            load();
        } catch (err) { toast.error('Error deleting investment'); }
        setDeleteTarget(null);
    };

    // ── Dynamic asset types from actual data ──
    const dynamicTypes = useMemo(() => {
        const types = [...new Set(investments.map(i => i.assetType).filter(Boolean))];
        return types.sort();
    }, [investments]);

    // ── Filtering & Sorting (for Track tab) ──
    const filtered = useMemo(() => {
        let list = [...investments];
        if (filterType) list = list.filter(i => i.assetType === filterType);
        switch (sortBy) {
            case 'roi-desc': list.sort((a, b) => b.roi - a.roi); break;
            case 'roi-asc': list.sort((a, b) => a.roi - b.roi); break;
            case 'invested-desc': list.sort((a, b) => b.investedAmount - a.investedAmount); break;
            case 'date-desc': list.sort((a, b) => new Date(b.dateInvested || 0) - new Date(a.dateInvested || 0)); break;
        }
        return list;
    }, [investments, filterType, sortBy]);

    // ── Portfolio Summary ──
    const summary = useMemo(() => {
        const totalInvested = investments.reduce((s, i) => s + i.investedAmount, 0);
        const currentValue = investments.reduce((s, i) => s + i.currentValue, 0);
        const pnl = currentValue - totalInvested;
        const pnlPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;
        return { totalInvested, currentValue, pnl, pnlPct };
    }, [investments]);

    // ── Allocation Chart ──
    const allocationData = useMemo(() => {
        const map = {};
        investments.forEach(i => {
            const t = i.assetType || 'Other';
            map[t] = (map[t] || 0) + i.currentValue;
        });
        const labels = Object.keys(map);
        const data = Object.values(map);
        const palette = isDark
            ? ['#6366f1', '#818cf8', '#a5b4fc', '#94a3b8', '#64748b', '#475569', '#cbd5e1']
            : ['#4f46e5', '#6366f1', '#818cf8', '#94a3b8', '#64748b', '#475569', '#a5b4fc'];
        return {
            labels,
            datasets: [{ data, backgroundColor: palette.slice(0, labels.length), borderWidth: 0, hoverOffset: 4 }],
        };
    }, [investments, isDark]);

    const chartOpts = {
        responsive: true, maintainAspectRatio: false, cutout: '62%',
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    padding: 12, boxWidth: 8, boxHeight: 8, usePointStyle: true, pointStyleWidth: 8,
                    font: { size: 11, family: 'Inter' }, color: isDark ? '#94a3b8' : '#64748b',
                },
            },
            tooltip: {
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                titleColor: isDark ? '#e2e8f0' : '#1e293b',
                bodyColor: isDark ? '#94a3b8' : '#64748b',
                borderColor: isDark ? '#334155' : '#e2e8f0',
                borderWidth: 1, padding: 10, bodyFont: { size: 11 },
                callbacks: { label: (ctx) => ` ${ctx.label}: ${fmt(ctx.raw)}` },
            },
        },
    };

    if (loading) return <div className="page-loader">Loading investments…</div>;

    return (
        <div className="page">
            <ConfirmModal
                open={!!deleteTarget} title="Delete Investment"
                message="Are you sure you want to delete this investment?"
                onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
            />

            <div className="page-header">
                <div>
                    <h1 className="page-title"><FiTrendingUp /> Investments</h1>
                    <p className="inv-subtitle">Manage and track your investment portfolio</p>
                </div>
            </div>

            {/* ── Tab Bar ── */}
            <div className="inv-tabs">
                <button className={`inv-tab ${tab === 'manage' ? 'inv-tab-active' : ''}`} onClick={() => setTab('manage')}>
                    <FiList /> Manage Investments
                </button>
                <button className={`inv-tab ${tab === 'track' ? 'inv-tab-active' : ''}`} onClick={() => setTab('track')}>
                    <FiBarChart2 /> Portfolio Tracker
                </button>
            </div>

            {/* ═══════════ TAB 1: MANAGE ═══════════ */}
            {tab === 'manage' && (
                <>
                    <div className="inv-tab-header">
                        <p className="inv-tab-desc">Add, edit, or remove investments from your portfolio.</p>
                        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(!showForm); }}><FiPlus /> Add Investment</button>
                    </div>

                    {showForm && (
                        <div className="form-card inv-form-card">
                            <div className="inv-form-header">
                                <h3>{editing ? 'Edit Investment' : 'New Investment'}</h3>
                                <button className="btn-icon" onClick={resetForm}><FiX /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="form-grid">
                                <div className="form-group">
                                    <label>Asset Name</label>
                                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Infosys, SBI MF" />
                                </div>
                                <div className="form-group">
                                    <label>Asset Type</label>
                                    {form.assetType === '__custom__' ? (
                                        <div className="inv-custom-type">
                                            <input
                                                value={form.customType || ''}
                                                onChange={e => setForm({ ...form, customType: e.target.value })}
                                                placeholder="Enter new asset type"
                                                autoFocus
                                            />
                                            <button type="button" className="btn-icon" onClick={() => setForm({ ...form, assetType: '', customType: '' })}><FiX /></button>
                                        </div>
                                    ) : (
                                        <select value={form.assetType} onChange={e => setForm({ ...form, assetType: e.target.value })}>
                                            <option value="">Select type</option>
                                            {[...new Set([...ASSET_TYPES, ...dynamicTypes])].sort().map(t => <option key={t} value={t}>{t}</option>)}
                                            <option value="__custom__">+ Add Custom Type</option>
                                        </select>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label>Quantity</label>
                                    <input type="number" step="0.0001" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="Units" />
                                </div>
                                <div className="form-group">
                                    <label>Buy Price / Unit</label>
                                    <input type="number" step="0.01" value={form.buyPrice} onChange={e => setForm({ ...form, buyPrice: e.target.value })} placeholder="₹ per unit" />
                                </div>
                                <div className="form-group">
                                    <label>Amount Invested</label>
                                    <input type="number" step="0.01" value={form.investedAmount} onChange={e => setForm({ ...form, investedAmount: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Current Value</label>
                                    <input type="number" step="0.01" value={form.currentValue} onChange={e => setForm({ ...form, currentValue: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Platform</label>
                                    <input value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} placeholder="e.g. Zerodha, Groww" />
                                </div>
                                <div className="form-group">
                                    <label>Date Invested</label>
                                    <input type="date" value={form.dateInvested} onChange={e => setForm({ ...form, dateInvested: e.target.value })} />
                                </div>
                                <div className="form-group form-full">
                                    <label>Notes</label>
                                    <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
                                </div>
                                <div className="form-actions">
                                    <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Add Investment'}</button>
                                    <button type="button" className="btn btn-ghost" onClick={resetForm}>Cancel</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Simple listing table for manage tab */}
                    <div className="inv-table-card">
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Asset</th><th>Type</th><th className="text-right">Invested</th>
                                        <th className="text-right">Current</th><th className="text-right">ROI</th>
                                        <th>Date</th><th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {investments.length === 0 ? (
                                        <tr><td colSpan="7" className="text-center">No investments yet — add your first one!</td></tr>
                                    ) : (
                                        investments.map(inv => {
                                            const isPos = inv.roi >= 0;
                                            return (
                                                <tr key={inv.id}>
                                                    <td>
                                                        <div className="inv-asset-cell">
                                                            <span className="inv-asset-name">{inv.name}</span>
                                                            {inv.platform && <span className="inv-asset-platform">{inv.platform}</span>}
                                                        </div>
                                                    </td>
                                                    <td><span className="inv-type-badge">{inv.assetType || '—'}</span></td>
                                                    <td className="text-right">{fmt(inv.investedAmount)}</td>
                                                    <td className="text-right">{fmt(inv.currentValue)}</td>
                                                    <td className={`text-right ${isPos ? 'text-green' : 'text-red'}`}>{isPos ? '+' : ''}{inv.roi?.toFixed(2)}%</td>
                                                    <td>{inv.dateInvested ? new Date(inv.dateInvested).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}</td>
                                                    <td>
                                                        <div className="action-btns">
                                                            <button className="btn-icon" onClick={() => handleEdit(inv)}><FiEdit2 /></button>
                                                            <button className="btn-icon btn-danger" onClick={() => setDeleteTarget(inv.id)}><FiTrash2 /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* ═══════════ TAB 2: PORTFOLIO TRACKER ═══════════ */}
            {tab === 'track' && (
                <>
                    {/* Portfolio Summary */}
                    <div className="inv-summary-grid">
                        <div className="inv-summary-card">
                            <div className="inv-sum-icon" style={{ color: '#6366f1', background: 'rgba(99,102,241,0.08)' }}><FiDollarSign /></div>
                            <div>
                                <p className="inv-sum-label">Total Invested</p>
                                <p className="inv-sum-value">{fmt(summary.totalInvested)}</p>
                            </div>
                        </div>
                        <div className="inv-summary-card">
                            <div className="inv-sum-icon" style={{ color: '#818cf8', background: 'rgba(129,140,248,0.08)' }}><FiTrendingUp /></div>
                            <div>
                                <p className="inv-sum-label">Current Value</p>
                                <p className="inv-sum-value">{fmt(summary.currentValue)}</p>
                            </div>
                        </div>
                        <div className="inv-summary-card">
                            <div className="inv-sum-icon" style={{ color: summary.pnl >= 0 ? '#10b981' : '#ef4444', background: summary.pnl >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)' }}>
                                {summary.pnl >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
                            </div>
                            <div>
                                <p className="inv-sum-label">Profit / Loss</p>
                                <p className={`inv-sum-value ${summary.pnl >= 0 ? 'text-green' : 'text-red'}`}>{summary.pnl >= 0 ? '+' : ''}{fmt(summary.pnl)}</p>
                            </div>
                        </div>
                        <div className="inv-summary-card">
                            <div className="inv-sum-icon" style={{ color: summary.pnlPct >= 0 ? '#10b981' : '#ef4444', background: summary.pnlPct >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)' }}><FiPercent /></div>
                            <div>
                                <p className="inv-sum-label">Return</p>
                                <p className={`inv-sum-value ${summary.pnlPct >= 0 ? 'text-green' : 'text-red'}`}>{summary.pnlPct >= 0 ? '+' : ''}{summary.pnlPct.toFixed(2)}%</p>
                            </div>
                        </div>
                    </div>

                    {/* Chart + Filters Row */}
                    <div className="inv-mid-row">
                        {investments.length > 0 && (
                            <div className="inv-chart-card">
                                <h3 className="inv-chart-title">Allocation by Type</h3>
                                <div className="inv-chart-wrap">
                                    <Doughnut data={allocationData} options={chartOpts} />
                                </div>
                            </div>
                        )}
                        <div className="inv-filters-card">
                            <h3 className="inv-chart-title"><FiFilter /> Filters</h3>
                            <div className="inv-filter-group">
                                <label className="inv-filter-label">Asset Type</label>
                                <div className="inv-pills">
                                    <button className={`inv-pill ${filterType === '' ? 'inv-pill-active' : ''}`} onClick={() => setFilterType('')}>All</button>
                                    {dynamicTypes.map(t => (
                                        <button key={t} className={`inv-pill ${filterType === t ? 'inv-pill-active' : ''}`} onClick={() => setFilterType(filterType === t ? '' : t)}>{t}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="inv-filter-group">
                                <label className="inv-filter-label">Sort By</label>
                                <select className="inv-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                                    {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Tracking Table */}
                    <div className="inv-table-card">
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Asset</th><th>Type</th><th>Qty</th>
                                        <th className="text-right">Buy Price</th>
                                        <th className="text-right">Invested</th>
                                        <th className="text-right">Current</th>
                                        <th className="text-right">P&L</th>
                                        <th className="text-right">ROI</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan="9" className="text-center">
                                            {filterType ? 'No investments match this filter' : 'No investments yet'}
                                        </td></tr>
                                    ) : (
                                        filtered.map(inv => {
                                            const pnl = inv.currentValue - inv.investedAmount;
                                            const isPos = pnl >= 0;
                                            return (
                                                <tr key={inv.id}>
                                                    <td>
                                                        <div className="inv-asset-cell">
                                                            <span className="inv-asset-name">{inv.name}</span>
                                                            {inv.platform && <span className="inv-asset-platform">{inv.platform}</span>}
                                                        </div>
                                                    </td>
                                                    <td><span className="inv-type-badge">{inv.assetType || '—'}</span></td>
                                                    <td>{inv.quantity ?? '—'}</td>
                                                    <td className="text-right">{inv.buyPrice != null ? fmt(inv.buyPrice) : '—'}</td>
                                                    <td className="text-right">{fmt(inv.investedAmount)}</td>
                                                    <td className="text-right">{fmt(inv.currentValue)}</td>
                                                    <td className={`text-right ${isPos ? 'text-green' : 'text-red'}`}>{isPos ? '+' : ''}{fmt(pnl)}</td>
                                                    <td className={`text-right ${isPos ? 'text-green' : 'text-red'}`}>{inv.roi >= 0 ? '+' : ''}{inv.roi?.toFixed(2)}%</td>
                                                    <td>{inv.dateInvested ? new Date(inv.dateInvested).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
