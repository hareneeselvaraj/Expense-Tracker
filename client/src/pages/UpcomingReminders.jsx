import { useState } from 'react';
import { FiBell, FiPlus, FiCalendar, FiCheck, FiClock } from 'react-icons/fi';

const sampleReminders = [
    { id: 1, title: 'Pay Monthly Loan', date: '2026-03-12', amount: 15000, category: 'Loan', status: 'upcoming', priority: 'high' },
    { id: 2, title: 'Online Meeting with Client', date: '2026-03-13', amount: null, category: 'Work', status: 'upcoming', priority: 'medium' },
    { id: 3, title: 'Send Money to Kate', date: '2026-03-15', amount: 5000, category: 'Transfer', status: 'upcoming', priority: 'low' },
    { id: 4, title: 'Cancel Subscription', date: '2026-03-18', amount: 999, category: 'Subscription', status: 'upcoming', priority: 'medium' },
    { id: 5, title: 'Home Bills Payment', date: '2026-03-20', amount: 3500, category: 'Bills', status: 'upcoming', priority: 'high' },
    { id: 6, title: 'Entertainment Subscription', date: '2026-03-25', amount: 499, category: 'Entertainment', status: 'upcoming', priority: 'low' },
];

const priorityColors = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };

export default function UpcomingReminders() {
    const [reminders, setReminders] = useState(sampleReminders);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ title: '', date: '', amount: '', category: 'General', priority: 'medium' });

    const handleSubmit = (e) => {
        e.preventDefault();
        const newReminder = {
            id: Date.now(),
            title: form.title,
            date: form.date,
            amount: form.amount ? Number(form.amount) : null,
            category: form.category,
            status: 'upcoming',
            priority: form.priority
        };
        setReminders([newReminder, ...reminders]);
        setShowForm(false);
        setForm({ title: '', date: '', amount: '', category: 'General', priority: 'medium' });
    };

    const handleDone = (id) => {
        setReminders(reminders.map(r => r.id === id ? { ...r, status: 'completed' } : r));
    };

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title"><FiBell /> Upcoming Reminders</h1>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                    <FiPlus /> Add Reminder
                </button>
            </div>

            {showForm && (
                <div className="form-card" style={{ marginBottom: '20px' }}>
                    <form onSubmit={handleSubmit} className="form-grid">
                        <div className="form-group">
                            <label>Title</label>
                            <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label>Date</label>
                            <input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label>Amount (Optional)</label>
                            <input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label>Category</label>
                            <input required value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="e.g. Bills, Work" />
                        </div>
                        <div className="form-group">
                            <label>Priority</label>
                            <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                            </select>
                        </div>
                        <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
                            <button type="submit" className="btn btn-primary">Add Reminder</button>
                            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="reminders-summary-row">
                <div className="reminder-summary-chip">
                    <FiClock /> <span>{reminders.filter(r => r.status === 'upcoming').length} Upcoming</span>
                </div>
                <div className="reminder-summary-chip" style={{ color: '#10b981' }}>
                    <FiCheck /> <span>{reminders.filter(r => r.status === 'completed').length} Completed</span>
                </div>
            </div>

            <div className="reminders-list">
                {reminders.map((r) => {
                    const date = new Date(r.date);
                    const dateLabel = date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
                    const daysLeft = Math.floor((date - new Date()) / (1000 * 60 * 60 * 24));
                    return (
                        <div className="reminder-card-full" key={r.id}>
                            <div className="reminder-priority-dot" style={{ background: priorityColors[r.priority] }} />
                            <div className="reminder-card-content">
                                <div className="reminder-title-row">
                                    <h3 className="reminder-title-text">{r.title}</h3>
                                    <span className="reminder-category-badge">{r.category}</span>
                                </div>
                                <div className="reminder-meta-row">
                                    <span><FiCalendar /> {dateLabel}</span>
                                    {r.amount && <span>₹{r.amount.toLocaleString()}</span>}
                                    <span style={{ color: daysLeft <= 3 ? '#ef4444' : daysLeft <= 7 ? '#f59e0b' : 'var(--text-muted)' }}>
                                        {daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `In ${daysLeft} days`}
                                    </span>
                                </div>
                            </div>
                            <button className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '6px 14px' }} onClick={() => handleDone(r.id)} disabled={r.status === 'completed'}>
                                <FiCheck /> {r.status === 'completed' ? 'Completed' : 'Done'}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
