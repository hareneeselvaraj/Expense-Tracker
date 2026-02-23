import { useState, useEffect } from 'react';
import api from '../services/api';
import { FiPlus, FiTrash2, FiEdit2 } from 'react-icons/fi';
import { useToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

export default function Investments() {
    const [investments, setInvestments] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const toast = useToast();
    const [form, setForm] = useState({ name: '', amountInvested: '', currentValue: '', platform: '', notes: '', dateInvested: '' });

    const load = () => api.get('/investment').then((res) => { setInvestments(res.data); setLoading(false); });
    useEffect(() => { load(); }, []);

    const resetForm = () => {
        setForm({ name: '', amountInvested: '', currentValue: '', platform: '', notes: '', dateInvested: '' });
        setEditing(null);
        setShowForm(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            ...form,
            amountInvested: parseFloat(form.amountInvested),
            currentValue: parseFloat(form.currentValue),
            dateInvested: form.dateInvested || undefined,
        };
        if (editing) {
            await api.put(`/investment/${editing}`, payload);
            toast.success('Investment updated successfully');
        } else {
            await api.post('/investment', payload);
            toast.success('Investment created successfully');
        }
        resetForm();
        load();
    };

    const handleEdit = (inv) => {
        setForm({
            name: inv.name, amountInvested: inv.amountInvested, currentValue: inv.currentValue,
            platform: inv.platform || '', notes: inv.notes || '',
            dateInvested: inv.dateInvested?.split('T')[0] || '',
        });
        setEditing(inv.id);
        setShowForm(true);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await api.delete(`/investment/${deleteTarget}`);
            toast.success('Investment deleted successfully');
            load();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error deleting investment');
        }
        setDeleteTarget(null);
    };

    if (loading) return <div className="page-loader">Loading…</div>;

    return (
        <div className="page">
            <ConfirmModal
                open={!!deleteTarget}
                title="Confirm Delete"
                message="Are you sure you want to delete this investment?"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
            <div className="page-header">
                <h1 className="page-title">Investments</h1>
                <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(!showForm); }}><FiPlus /> New</button>
            </div>

            {showForm && (
                <div className="form-card">
                    <h3>{editing ? 'Edit Investment' : 'New Investment'}</h3>
                    <form onSubmit={handleSubmit} className="form-grid">
                        <div className="form-group">
                            <label>Name</label>
                            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label>Amount Invested</label>
                            <input type="number" step="0.01" value={form.amountInvested} onChange={(e) => setForm({ ...form, amountInvested: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label>Current Value</label>
                            <input type="number" step="0.01" value={form.currentValue} onChange={(e) => setForm({ ...form, currentValue: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label>Platform</label>
                            <input value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} placeholder="e.g. Zerodha" />
                        </div>
                        <div className="form-group">
                            <label>Date Invested</label>
                            <input type="date" value={form.dateInvested} onChange={(e) => setForm({ ...form, dateInvested: e.target.value })} />
                        </div>
                        <div className="form-group form-full">
                            <label>Notes</label>
                            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
                            <th>Name</th><th>Platform</th><th className="text-right">Invested</th>
                            <th className="text-right">Current</th><th className="text-right">ROI</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {investments.length === 0 ? (
                            <tr><td colSpan="6" className="text-center">No investments yet</td></tr>
                        ) : (
                            investments.map((inv) => {
                                const roi = inv.amountInvested > 0 ? (((inv.currentValue - inv.amountInvested) / inv.amountInvested) * 100).toFixed(2) : 0;
                                return (
                                    <tr key={inv.id}>
                                        <td>{inv.name}</td>
                                        <td>{inv.platform || '—'}</td>
                                        <td className="text-right">₹{inv.amountInvested?.toLocaleString('en-IN')}</td>
                                        <td className="text-right">₹{inv.currentValue?.toLocaleString('en-IN')}</td>
                                        <td className={`text-right ${roi >= 0 ? 'text-green' : 'text-red'}`}>{roi}%</td>
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
    );
}
