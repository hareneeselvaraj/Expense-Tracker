import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FiArrowUp, FiArrowDown, FiDollarSign, FiTrendingUp, FiBarChart2, FiPieChart, FiActivity, FiTarget } from 'react-icons/fi';
import MonthlyChart from '../charts/MonthlyChart';
import MonthlySpendingChart from '../charts/MonthlySpendingChart';
import CategoryChart from '../charts/CategoryChart';
import YearlyTrendChart from '../charts/YearlyTrendChart';
import BankWiseChart from '../charts/BankWiseChart';
import OnlineOfflineChart from '../charts/OnlineOfflineChart';
import BudgetChart from '../charts/BudgetChart';

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        api.get('/dashboard').then((res) => {
            setData(res.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) return <div className="page-loader">Loading dashboard…</div>;
    if (!data) return <div className="page-empty">No data available yet. Add some transactions!</div>;

    const firstName = user?.name?.split(' ')[0] || 'there';
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const cards = [
        { label: 'Total Income', value: data.totalIncome, icon: <FiArrowUp />, color: '#10b981' },
        { label: 'Total Expense', value: data.totalExpense, icon: <FiArrowDown />, color: '#ef4444' },
        { label: 'Current Balance', value: data.currentBalance, icon: <FiDollarSign />, color: '#818cf8' },
        { label: 'Total Investment', value: data.totalInvestment, icon: <FiTrendingUp />, color: '#f59e0b' },
    ];

    return (
        <div className="page">
            {/* Greeting Header */}
            <div className="dashboard-header">
                <h1 className="dashboard-greeting">Welcome back, <span>{firstName}</span> 👋</h1>
                <p className="dashboard-subtitle">{dateStr}</p>
            </div>

            {/* Stat Cards */}
            <div className="stats-grid">
                {cards.map((c) => (
                    <div key={c.label} className="stat-card" style={{ '--accent': c.color }}>
                        <div className="stat-icon">{c.icon}</div>
                        <div>
                            <p className="stat-label">{c.label}</p>
                            <p className="stat-value">₹{(c.value ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Primary Charts Grid (2×2) ── */}
            <div className="dash-charts-2x2">
                <div className="dash-chart-card">
                    <h3 className="dash-chart-title">Category-wise Spending</h3>
                    <CategoryChart data={data.categoryWiseSpending || []} />
                </div>
                <div className="dash-chart-card">
                    <h3 className="dash-chart-title">Monthly Spending</h3>
                    <MonthlySpendingChart data={data.monthlySummary || []} />
                </div>
                <div className="dash-chart-card">
                    <h3 className="dash-chart-title">Yearly Expense Trend</h3>
                    <YearlyTrendChart data={data.yearlyTrend || []} />
                </div>
                <div className="dash-chart-card">
                    <h3 className="dash-chart-title">Bank-wise Spending</h3>
                    <BankWiseChart data={data.bankWiseSpending || []} />
                </div>
            </div>

            {/* ── Secondary Charts ── */}
            <div className="charts-grid">
                <div className="chart-card chart-wide">
                    <h3><FiBarChart2 /> Monthly Summary</h3>
                    <MonthlyChart data={data.monthlySummary || []} />
                </div>
                <div className="chart-card">
                    <h3><FiActivity /> Online vs Offline</h3>
                    <OnlineOfflineChart data={data.onlineVsOfflineSummary} />
                </div>
                <div className="chart-card chart-wide">
                    <h3><FiTarget /> Budget vs Actual</h3>
                    <BudgetChart data={data.budgetVsActual || []} />
                </div>
            </div>

            {/* Accounts */}
            {data.accounts?.length > 0 && (
                <div className="section">
                    <h3 className="section-title">Accounts</h3>
                    <div className="accounts-grid">
                        {data.accounts.map((a) => (
                            <div key={a.id} className="account-mini-card">
                                <p className="account-mini-name">{a.name}</p>
                                <p className="account-mini-balance">₹{(a.balance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                                <span className="badge account-mini-type">{a.type}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
