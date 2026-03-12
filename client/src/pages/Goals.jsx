import { useState, useEffect } from 'react';
import { FiTarget, FiPlus, FiHome, FiShoppingBag, FiAirplay, FiCheckCircle, FiClock, FiList, FiAlertCircle, FiEdit2, FiX } from 'react-icons/fi';

const initialGoals = [
    {
        id: 1,
        icon: <FiHome />,
        title: 'Dream Home Down Payment',
        description: '20% down payment for 3BHK',
        target: 1500000,
        current: 345000,
        deadline: '2028-12-31',
        color: '#6366f1',
    },
    {
        id: 2,
        icon: <FiAirplay />,
        title: 'Emergency Fund',
        description: '6 months of living expenses',
        target: 180000,
        current: 148000,
        deadline: '2026-06-30',
        color: '#10b981',
    },
    {
        id: 3,
        icon: <FiShoppingBag />,
        title: 'Japan Vacation',
        description: '10-day Japan trip with family',
        target: 250000,
        current: 62000,
        deadline: '2026-12-31',
        color: '#f59e0b',
    },
    {
        id: 4,
        icon: <FiTarget />,
        title: 'Investment Portfolio',
        description: 'Build ₹10L investment corpus',
        target: 1000000,
        current: 824000,
        deadline: '2026-09-30',
        color: '#f43f5e',
    },
    {
        id: 5,
        icon: <FiCheckCircle />,
        title: 'New MacBook Pro',
        description: 'M4 MacBook Pro for work',
        target: 250000,
        current: 210000,
        deadline: '2026-04-30',
        color: '#06b6d4',
    },
];

export default function Goals() {
    const [goals, setGoals] = useState(initialGoals);
    const [loaded, setLoaded] = useState(false);
    
    // Modal State
    const [editingGoal, setEditingGoal] = useState(null);
    const [editFormData, setEditFormData] = useState({ target: '', current: '', deadline: '' });

    useEffect(() => {
        const timer = setTimeout(() => setLoaded(true), 50);
        return () => clearTimeout(timer);
    }, []);

    const totalTarget = goals.reduce((a, g) => a + g.target, 0);
    const totalCurrent = goals.reduce((a, g) => a + g.current, 0);
    const totalRemaining = goals.reduce((a, g) => a + (g.target - g.current), 0);

    const handleEditClick = (goal) => {
        setEditingGoal(goal);
        setEditFormData({
            target: goal.target.toString(),
            current: goal.current.toString(),
            deadline: goal.deadline
        });
    };

    const handleUpdateGoal = (e) => {
        e.preventDefault();
        setGoals(prev => prev.map(g => {
            if (g.id === editingGoal.id) {
                return {
                    ...g,
                    target: Number(editFormData.target),
                    current: Number(editFormData.current),
                    deadline: editFormData.deadline
                };
            }
            return g;
        }));
        setEditingGoal(null);
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title"><FiTarget /> Financial Goals</h1>
                    <p className="page-subtitle">Track and achieve your deepest financial aspirations</p>
                </div>
                <button className="btn btn-primary"><FiPlus /> Add Goal</button>
            </div>

            {/* Premium Stat Cards */}
            <div className="goals-summary-cards">
                <div className="goal-stat-card variant-indigo" style={{ animationDelay: '0s' }}>
                    <FiList className="goal-stat-bg-icon" />
                    <p className="goal-stat-label">Active Goals</p>
                    <p className="goal-stat-value">{goals.length}</p>
                </div>
                
                <div className="goal-stat-card variant-amber" style={{ animationDelay: '0.1s' }}>
                    <FiTarget className="goal-stat-bg-icon" />
                    <p className="goal-stat-label">Total Target</p>
                    <p className="goal-stat-value">₹{(totalTarget / 1000).toFixed(0)}k</p>
                </div>

                <div className="goal-stat-card variant-emerald" style={{ animationDelay: '0.2s' }}>
                    <FiCheckCircle className="goal-stat-bg-icon" />
                    <p className="goal-stat-label">Total Saved</p>
                    <p className="goal-stat-value">₹{(totalCurrent / 1000).toFixed(0)}k</p>
                </div>

                <div className="goal-stat-card variant-rose" style={{ animationDelay: '0.3s' }}>
                    <FiClock className="goal-stat-bg-icon" />
                    <p className="goal-stat-label">Remaining</p>
                    <p className="goal-stat-value">₹{(totalRemaining / 1000).toFixed(0)}k</p>
                </div>
            </div>

            {/* Premium Goals Grid */}
            <div className="goals-grid">
                {goals.map((goal, i) => {
                    const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
                    const daysLeft = Math.floor((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24));
                    
                    let deadlineClass = 'safe';
                    let deadlineIcon = <FiClock/>;
                    if (daysLeft < 0) { deadlineClass = 'urgent'; deadlineIcon = <FiAlertCircle/>; }
                    else if (daysLeft < 30) { deadlineClass = 'urgent'; deadlineIcon = <FiAlertCircle/>; }
                    else if (daysLeft < 90) { deadlineClass = 'warning'; }

                    const radius = 45; // reduced mapping radius for smaller 110px circle SVG
                    const circumference = 2 * Math.PI * radius;
                    const strokeDashoffset = loaded ? circumference - (pct / 100) * circumference : circumference;

                    return (
                        <div className="goal-premium-card" key={goal.id} style={{ '--goal-color': goal.color, animationDelay: `${0.4 + i * 0.1}s` }}>
                            
                            <div className="goal-card-hero">
                                <div className="goal-hero-icon">{goal.icon}</div>
                                <button className="goal-edit-btn" onClick={() => handleEditClick(goal)} title="Update Goal">
                                    <FiEdit2 />
                                </button>
                            </div>
                            
                            <div className="goal-card-body">
                                <h3 className="goal-title">{goal.title}</h3>
                                <p className="goal-desc">{goal.description}</p>
                                
                                <div className="goal-ring-container">
                                    <svg className="goal-ring-svg" viewBox="0 0 110 110" preserveAspectRatio="xMidYMid meet">
                                        <circle
                                            className="goal-ring-bg"
                                            cx="55" cy="55" r={radius}
                                        />
                                        <circle
                                            className="goal-ring-fill"
                                            cx="55" cy="55" r={radius}
                                            strokeDasharray={circumference}
                                            strokeDashoffset={strokeDashoffset}
                                        />
                                    </svg>
                                    <div className="goal-ring-content">
                                        <span className="goal-ring-pct">{pct}%</span>
                                        <span className="goal-ring-label">Complete</span>
                                    </div>
                                </div>

                                <div className="goal-card-footer">
                                    <div className="goal-footer-amount">
                                        <span className="goal-saved">₹{goal.current.toLocaleString()}</span>
                                        <span className="goal-target">of ₹{goal.target.toLocaleString()} target</span>
                                    </div>
                                    <span className={`goal-deadline-pill ${deadlineClass}`}>
                                        {deadlineIcon}
                                        {daysLeft < 0 ? 'Overdue' : daysLeft === 0 ? 'Due Today' : `${daysLeft} days left`}
                                    </span>
                                </div>
                            </div>

                        </div>
                    );
                })}
            </div>

            {/* Edit Goal Modal */}
            {editingGoal && (
                <div className="goal-modal-overlay" onClick={() => setEditingGoal(null)}>
                    <div className="goal-modal" style={{ '--goal-color': editingGoal.color }} onClick={e => e.stopPropagation()}>
                        <div className="goal-modal-header">
                            <h2>Update '{editingGoal.title}'</h2>
                            <button className="goal-modal-close" onClick={() => setEditingGoal(null)}><FiX /></button>
                        </div>
                        <form className="goal-modal-form" onSubmit={handleUpdateGoal}>
                            <div className="goal-input-group">
                                <label>Target Amount (₹)</label>
                                <input 
                                    type="number" 
                                    required
                                    min="1"
                                    value={editFormData.target}
                                    onChange={e => setEditFormData({...editFormData, target: e.target.value})}
                                />
                            </div>
                            <div className="goal-input-group">
                                <label>Currently Saved (₹)</label>
                                <input 
                                    type="number" 
                                    required
                                    min="0"
                                    value={editFormData.current}
                                    onChange={e => setEditFormData({...editFormData, current: e.target.value})}
                                />
                            </div>
                            <div className="goal-input-group">
                                <label>Target Deadline</label>
                                <input 
                                    type="date" 
                                    required
                                    value={editFormData.deadline}
                                    onChange={e => setEditFormData({...editFormData, deadline: e.target.value})}
                                />
                            </div>
                            <div className="goal-modal-actions">
                                <button type="button" className="goal-btn-cancel" onClick={() => setEditingGoal(null)}>Cancel</button>
                                <button type="submit" className="goal-btn-save">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
