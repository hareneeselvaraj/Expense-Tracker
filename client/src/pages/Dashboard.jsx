import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
    FiArrowUpRight, FiArrowDownRight, FiDollarSign, FiRefreshCw,
    FiTrendingUp, FiPlus, FiChevronRight, FiGrid,
    FiBell, FiClock, FiBarChart2
} from 'react-icons/fi';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, BarElement, PointElement, LineElement,
    ArcElement, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale, LinearScale, BarElement, PointElement, LineElement,
    ArcElement, Tooltip, Legend, Filler
);

/* ── helpers ── */
const fmt = (n) => {
    const v = n ?? 0;
    const abs = Math.abs(v);
    if (abs >= 100000) return `${(v / 100000).toFixed(1)}L`;
    if (abs >= 1000) return `${(v / 1000).toFixed(1)}K`;
    return String(v);
};

/* ── Circular progress ring (SVG) ── */
function CircleRing({ pct, color, size = 60, stroke = 7 }) {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (pct / 100) * circ;
    return (
        <svg width={size} height={size} className="circle-ring">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke="var(--bg-input)" strokeWidth={stroke} opacity="0.5" />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={color} strokeWidth={stroke}
                strokeDasharray={circ} strokeDashoffset={offset}
                strokeLinecap="round"
                style={{
                    filter: `drop-shadow(0 2px 6px ${color}80)`,
                    transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                transform={`rotate(-90 ${size / 2} ${size / 2})`} />
            <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle"
                fill="var(--text)" fontSize="11" fontWeight="800"
                style={{ letterSpacing: '-0.3px' }}>{pct}%</text>
        </svg>
    );
}

/* ── static sample data ── */
const SAMPLE_REMINDERS = [
    { id: 1, title: 'Pay Monthly Loan', date: 'Today, 4 May', color: '#6366f1' },
    { id: 2, title: 'Online Meeting with Client', date: 'Tomorrow, 5 May', color: '#818cf8' },
    { id: 3, title: 'Send Money to Kate', date: 'Tuesday, 29 May', color: '#a5b4fc' },
    { id: 4, title: 'Cancel Subscription', date: 'Tuesday, 29 May', color: '#a5b4fc' },
];

const SAMPLE_UPCOMING = [
    { id: 1, title: 'Home bills', sub: '#rent', date: 'Today, 4 May', icon: '🏠', amount: -800 },
    { id: 2, title: 'Home bills', sub: '#rent', date: 'Today, 4 May', icon: '🏠', amount: -750 },
    { id: 3, title: 'Entertainment', sub: '#subscription', date: 'Friday, 10 May', icon: '🎮', amount: -49 },
    { id: 4, title: 'Transport', sub: '#monthly_ticket', date: 'Friday, 10 May', icon: '🚌', amount: -120 },
];

const CATEGORY_TILES = [
    { label: 'Food', icon: '🍽️', color: '#c084fc', share: 30 },
    { label: 'Shopping', icon: '🛍️', color: '#818cf8', share: 20 },
    { label: 'Home', icon: '🏠', color: '#f59e0b', share: 15 },
    { label: 'Entertainment', icon: '🎮', color: '#ec4899', share: 10 },
    { label: 'Gaming', icon: '🕹️', color: '#6366f1', share: 8 },
    { label: 'Bill', icon: '💡', color: '#10b981', share: 9 },
    { label: 'Others', icon: '➕', color: '#475569', share: 8 },
];

const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEK_EXPENSE = [12000, 8000, 5000, 18000, 6000, 9000, 4000];
const WEEK_INCOME = [0, 0, 21800, 0, 0, 0, 0];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS = ['2022', '2023', '2024', '2025', '2026'];

const SAMPLE_TXS = [
    { icon: '🏠', title: 'Home bills', bank: 'BNP Bank', amount: -80000, date: 'Today, 4 May' },
    { icon: '🏠', title: 'Home bills', bank: 'BNP Bank', amount: -75000, date: 'Today, 4 May' },
    { icon: '🛒', title: 'Grocery', bank: 'Citi Bank', amount: -23000, date: 'Sunday, 3 May' },
    { icon: '💼', title: 'Salary', bank: 'BNP Bank', amount: 218000, date: 'Saturday, 2 May' },
    { icon: '⚽', title: 'Sport', bank: 'Cash', amount: -3800, date: 'Saturday, 2 May' },
];

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const { isDark } = useTheme();
    const [chartType, setChartType] = useState('bar');
    const [balView, setBalView] = useState('pie');
    const [month, setMonth] = useState('March');
    const [year, setYear] = useState('2026');
    const [account, setAccount] = useState('All Accounts');

    useEffect(() => {
        api.get('/dashboard').then((res) => {
            setData(res.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) return <div className="page-loader">Loading dashboard…</div>;

    /* values */
    const income = data?.totalIncome ?? 0;
    const expense = data?.totalExpense ?? 0;
    const balance = data?.currentBalance ?? 0;
    const total = income || 1;
    const balPct = Math.min(100, Math.round(Math.abs(balance / total) * 100)) || 72;
    const expPct = Math.min(100, Math.round((expense / total) * 100)) || 28;

    /* chart.js color helpers */
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const tickColor = isDark ? '#6b7394' : '#7c8298';
    const ttBg = isDark ? 'rgba(20,24,33,0.95)' : 'rgba(255,255,255,0.96)';
    const ttText = isDark ? '#c8cad0' : '#1a1d28';
    const ttBorder = isDark ? 'rgba(42,49,72,0.5)' : 'rgba(0,0,0,0.08)';

    const baseTooltip = {
        backgroundColor: ttBg, titleColor: ttText, bodyColor: ttText,
        borderColor: ttBorder, borderWidth: 1, padding: 10, cornerRadius: 8,
        titleFont: { size: 11, weight: '500', family: 'Inter' },
        bodyFont: { size: 10, family: 'Inter' },
    };

    /* ── week chart data ── */
    const weekBarData = {
        labels: WEEK_LABELS,
        datasets: [
            {
                label: 'Expense',
                data: WEEK_EXPENSE,
                backgroundColor: 'rgba(239,68,68,0.75)',
                hoverBackgroundColor: '#ef4444',
                borderRadius: 5,
                borderSkipped: false,
                maxBarThickness: 12,
            },
            {
                label: 'Income',
                data: WEEK_INCOME,
                backgroundColor: 'rgba(16,185,129,0.75)',
                hoverBackgroundColor: '#10b981',
                borderRadius: 5,
                borderSkipped: false,
                maxBarThickness: 12,
            },
        ],
    };

    const weekLineData = {
        labels: WEEK_LABELS,
        datasets: [
            {
                label: 'Expense',
                data: WEEK_EXPENSE,
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239,68,68,0.08)',
                borderWidth: 2,
                pointRadius: 3,
                pointBackgroundColor: '#ef4444',
                fill: true,
                tension: 0.4,
            },
            {
                label: 'Income',
                data: WEEK_INCOME,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16,185,129,0.08)',
                borderWidth: 2,
                pointRadius: 3,
                pointBackgroundColor: '#10b981',
                fill: true,
                tension: 0.4,
            },
        ],
    };

    const weekChartOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: baseTooltip },
        scales: {
            x: { grid: { display: false }, border: { display: false }, ticks: { color: tickColor, font: { size: 10, family: 'Inter' } } },
            y: { display: false, beginAtZero: true },
        },
    };

    /* ── donut / balance chart ── */
    const donutData = {
        labels: ['Balance', 'Expense', 'Income'],
        datasets: [{
            data: [Math.max(balance, 1), expense || 1, income || 1],
            backgroundColor: ['#6366f1', '#ef4444', '#10b981'],
            borderWidth: 0,
            hoverOffset: 8,
        }],
    };

    const donutOptions = {
        responsive: true, maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
            legend: { display: false },
            tooltip: { ...baseTooltip, callbacks: { label: (c) => ` ${c.label}: ₹${(c.raw).toLocaleString('en-IN')}` } },
        },
    };

    const recent = data?.recentTransactions ?? SAMPLE_TXS;

    return (
        <div className="dash-new">
            {/* ── Top Header ── */}
            <div className="dash-top-bar">
                <h1 className="dash-title">My Dashboard</h1>
                <div className="dash-filters">
                    <select className="dash-filter-select" value={account} onChange={e => setAccount(e.target.value)}>
                        <option>All Accounts</option>
                        {data?.accounts?.map(a => <option key={a.id}>{a.name}</option>)}
                    </select>
                    <select className="dash-filter-select" value={month} onChange={e => setMonth(e.target.value)}>
                        {MONTHS.map(m => <option key={m}>{m}</option>)}
                    </select>
                    <select className="dash-filter-select" value={year} onChange={e => setYear(e.target.value)}>
                        {YEARS.map(y => <option key={y}>{y}</option>)}
                    </select>
                    <button className="dash-filter-icon-btn"><FiRefreshCw /></button>
                </div>
            </div>

            {/* ── 3 Stat Cards ── */}
            <div className="dash-stat-row">
                <div className="dash-stat-card dash-stat-balance">
                    <div className="dash-stat-info">
                        <p className="dash-stat-label">Balance</p>
                        <p className="dash-stat-sub">{data?.accounts?.length || 10} Transactions</p>
                        <p className="dash-stat-amount">₹{fmt(balance)}</p>
                    </div>
                    <CircleRing pct={balPct} color="#818cf8" size={80} stroke={6} />
                </div>
                <div className="dash-stat-card dash-stat-expense">
                    <div className="dash-stat-info">
                        <p className="dash-stat-label">Expense</p>
                        <p className="dash-stat-sub">9 Transactions</p>
                        <p className="dash-stat-amount">-₹{fmt(expense)}</p>
                    </div>
                    <CircleRing pct={expPct} color="#ef4444" size={80} stroke={6} />
                </div>
                <div className="dash-stat-card dash-stat-income">
                    <div className="dash-stat-info">
                        <p className="dash-stat-label">Income</p>
                        <p className="dash-stat-sub">1 Transaction</p>
                        <p className="dash-stat-amount">+₹{fmt(income)}</p>
                    </div>
                    <CircleRing pct={100} color="#10b981" size={80} stroke={6} />
                </div>
            </div>

            {/* ── Middle 3-col: Categories | Statistics | Reminders ── */}
            <div className="dash-mid-grid">
                {/* Categories */}
                <div className="dash-panel">
                    <div className="dash-panel-header">
                        <span className="dash-panel-title"><FiGrid /> Categories</span>
                        <div className="dash-chart-toggle">
                            <button className="dash-toggle-btn active-toggle">Expenses</button>
                            <button className="dash-toggle-btn">Incomes</button>
                        </div>
                    </div>
                    <div className="category-treemap">
                        {CATEGORY_TILES.map((t) => (
                            <div key={t.label}
                                className="cat-tile"
                                style={{ background: t.color + '15', borderColor: t.color + '40' }}>
                                <span className="cat-tile-icon">{t.icon}</span>
                                <div className="cat-tile-info">
                                    <span className="cat-tile-label">{t.label}</span>
                                    <span className="cat-tile-pct" style={{ color: t.color }}>{t.share}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Statistics */}
                <div className="dash-panel">
                    <div className="dash-panel-header">
                        <span className="dash-panel-title"><FiTrendingUp /> Statistics</span>
                        <div className="dash-chart-toggle">
                            <button className={`dash-toggle-btn ${chartType === 'bar' ? 'active-toggle' : ''}`}
                                onClick={() => setChartType('bar')}>Bar Graph</button>
                            <button className={`dash-toggle-btn ${chartType === 'line' ? 'active-toggle' : ''}`}
                                onClick={() => setChartType('line')}>Line Graph</button>
                        </div>
                    </div>
                    <p className="dash-stat-period">This Week</p>
                    <div style={{ height: '180px', marginTop: '10px' }}>
                        {chartType === 'bar'
                            ? <Bar data={weekBarData} options={weekChartOptions} />
                            : <Line data={weekLineData} options={weekChartOptions} />
                        }
                    </div>
                    <div className="dash-chart-legend">
                        <span><span className="legend-dot" style={{ background: '#ef4444' }} />Expense</span>
                        <span><span className="legend-dot" style={{ background: '#10b981' }} />Income</span>
                    </div>
                </div>

                {/* Reminders */}
                <div className="dash-panel">
                    <div className="dash-panel-header">
                        <span className="dash-panel-title"><FiBell /> Reminders</span>
                        <Link to="/reminders" className="dash-see-all"><FiPlus /></Link>
                    </div>
                    <div className="reminder-list">
                        {SAMPLE_REMINDERS.map((r, i) => (
                            <div key={r.id} className="reminder-item">
                                {(i === 0 || SAMPLE_REMINDERS[i - 1].date !== r.date) && (
                                    <div className="reminder-date-label" style={{
                                        color: i === 0 ? '#10b981' : i === 1 ? '#818cf8' : 'var(--text-muted)'
                                    }}>{r.date}</div>
                                )}
                                <div className="reminder-row">
                                    <div className="reminder-dot" style={{ background: r.color }} />
                                    <span className="reminder-text">{r.title}</span>
                                    <FiChevronRight className="reminder-chevron" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Bottom 2-col: Transactions | Upcoming ── */}
            <div className="dash-bottom-grid">
                {/* Transactions */}
                <div className="dash-panel">
                    <div className="dash-panel-header">
                        <span className="dash-panel-title"><FiRefreshCw /> Transactions</span>
                        <Link to="/transactions" className="dash-see-all">See All <FiChevronRight /></Link>
                    </div>
                    <div className="dash-tx-list">
                        {(recent.length > 0 ? recent.slice(0, 5) : SAMPLE_TXS).map((tx, i) => {
                            const amt = tx.amount ?? tx.Amount ?? 0;
                            return (
                                <div key={i} className="dash-tx-row">
                                    <div className="dash-tx-icon">{tx.icon ?? tx.category?.[0] ?? '💳'}</div>
                                    <div className="dash-tx-info">
                                        <p className="dash-tx-title">{tx.title ?? tx.description ?? 'Transaction'}</p>
                                        <p className="dash-tx-sub">{tx.bank ?? tx.bankName ?? 'Account'}</p>
                                    </div>
                                    <div className="dash-tx-right">
                                        <p className="dash-tx-amount" style={{ color: amt >= 0 ? '#10b981' : '#ef4444' }}>
                                            {amt >= 0 ? '+' : ''}₹{Math.abs(amt).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </p>
                                        <p className="dash-tx-date">{tx.date ?? ''}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Upcoming */}
                <div className="dash-panel">
                    <div className="dash-panel-header">
                        <span className="dash-panel-title"><FiClock /> Upcoming</span>
                        <Link to="/upcoming" className="dash-see-all"><FiPlus /></Link>
                    </div>
                    <p className="dash-stat-period" style={{ color: '#10b981' }}>Today, 4 May</p>
                    <div className="dash-tx-list">
                        {SAMPLE_UPCOMING.map((u) => (
                            <div key={u.id} className="dash-tx-row">
                                <div className="dash-tx-icon">{u.icon}</div>
                                <div className="dash-tx-info">
                                    <p className="dash-tx-title">{u.title}</p>
                                    <p className="dash-tx-sub">{u.sub}</p>
                                </div>
                                <div className="dash-tx-right">
                                    <p className="dash-tx-amount" style={{ color: '#ef4444' }}>
                                        {u.amount.toFixed(2)}$
                                    </p>
                                    <p className="dash-tx-date">{u.date}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Balance Donut Section ── */}
            <div className="dash-panel">
                <div className="dash-panel-header">
                    <span className="dash-panel-title"><FiDollarSign /> Balance</span>
                    <div className="dash-chart-toggle">
                        <button className={`dash-toggle-btn ${balView === 'pie' ? 'active-toggle' : ''}`}
                            onClick={() => setBalView('pie')}>Pie Chart</button>
                        <button className={`dash-toggle-btn ${balView === 'bar' ? 'active-toggle' : ''}`}
                            onClick={() => setBalView('bar')}>Bar Graph</button>
                    </div>
                </div>
                <div className="dash-balance-content">
                    <div style={{ width: '100%', height: 180, flexShrink: 0, minWidth: 180, display: 'flex', justifyContent: 'center' }}>
                        {balView === 'pie' ? (
                            <Doughnut data={donutData} options={donutOptions} />
                        ) : (
                            <Bar
                                data={{
                                    labels: donutData.labels,
                                    datasets: [{
                                        ...donutData.datasets[0],
                                        borderRadius: 4,
                                        maxBarThickness: 32
                                    }]
                                }}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: false }, tooltip: baseTooltip },
                                    scales: {
                                        x: { grid: { display: false }, border: { display: false }, ticks: { color: tickColor, font: { size: 10, family: 'Inter' } } },
                                        y: { display: false, beginAtZero: true },
                                    }
                                }}
                            />
                        )}
                    </div>
                    <div className="dash-balance-legend">
                        {[['Balance', '#6366f1', balPct], ['Expense', '#ef4444', expPct], ['Income', '#10b981', 100]].map(([name, color, pct]) => (
                            <div key={name} className="dash-legend-row">
                                <span className="legend-dot" style={{ background: color }} />
                                <span className="dash-legend-name">{name}</span>
                                <span className="dash-legend-pct" style={{ color }}>{pct}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
