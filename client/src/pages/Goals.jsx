import { useState } from 'react';
import { FiTarget, FiPlus, FiTrendingUp, FiHome, FiShoppingBag, FiAirplay } from 'react-icons/fi';

const sampleGoals = [
    {
        id: 1,
        icon: <FiHome />,
        title: 'Buy a House',
        description: 'Save for down payment',
        target: 500000,
        current: 125000,
        deadline: '2027-12-31',
        color: '#6366f1',
    },
    {
        id: 2,
        icon: <FiAirplay />,
        title: 'Emergency Fund',
        description: '6 months of expenses',
        target: 60000,
        current: 42000,
        deadline: '2026-06-30',
        color: '#10b981',
    },
    {
        id: 3,
        icon: <FiShoppingBag />,
        title: 'Vacation Fund',
        description: 'Europe trip savings',
        target: 80000,
        current: 18000,
        deadline: '2026-12-31',
        color: '#f59e0b',
    },
    {
        id: 4,
        icon: <FiTrendingUp />,
        title: 'Investment Portfolio',
        description: 'Build investment corpus',
        target: 200000,
        current: 67000,
        deadline: '2028-01-01',
        color: '#ec4899',
    },
];

export default function Goals() {
    const [goals] = useState(sampleGoals);

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title"><FiTarget /> Goals</h1>
                <button className="btn btn-primary"><FiPlus /> Add Goal</button>
            </div>

            <div className="goals-summary-cards">
                <div className="goal-summary-card">
                    <p className="goal-summary-label">Total Goals</p>
                    <p className="goal-summary-value">{goals.length}</p>
                </div>
                <div className="goal-summary-card">
                    <p className="goal-summary-label">Target Amount</p>
                    <p className="goal-summary-value">₹{goals.reduce((a, g) => a + g.target, 0).toLocaleString()}</p>
                </div>
                <div className="goal-summary-card">
                    <p className="goal-summary-label">Saved So Far</p>
                    <p className="goal-summary-value" style={{ color: '#10b981' }}>₹{goals.reduce((a, g) => a + g.current, 0).toLocaleString()}</p>
                </div>
                <div className="goal-summary-card">
                    <p className="goal-summary-label">Remaining</p>
                    <p className="goal-summary-value" style={{ color: '#ef4444' }}>
                        ₹{goals.reduce((a, g) => a + (g.target - g.current), 0).toLocaleString()}
                    </p>
                </div>
            </div>

            <div className="goals-grid">
                {goals.map((goal) => {
                    const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
                    const daysLeft = Math.floor((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24));
                    return (
                        <div className="goal-card" key={goal.id} style={{ '--goal-color': goal.color }}>
                            <div className="goal-card-header">
                                <div className="goal-icon" style={{ background: `${goal.color}22`, color: goal.color }}>
                                    {goal.icon}
                                </div>
                                <div>
                                    <h3 className="goal-title">{goal.title}</h3>
                                    <p className="goal-desc">{goal.description}</p>
                                </div>
                                <span className="goal-pct-badge" style={{ background: `${goal.color}22`, color: goal.color }}>
                                    {pct}%
                                </span>
                            </div>
                            <div className="goal-progress-bar">
                                <div
                                    className="goal-progress-fill"
                                    style={{ width: `${pct}%`, background: goal.color }}
                                />
                            </div>
                            <div className="goal-meta">
                                <span>₹{goal.current.toLocaleString()} / ₹{goal.target.toLocaleString()}</span>
                                <span style={{ color: daysLeft < 60 ? '#ef4444' : 'var(--text-muted)' }}>
                                    {daysLeft > 0 ? `${daysLeft} days left` : 'Overdue'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
