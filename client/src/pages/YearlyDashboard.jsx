import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FiChevronLeft, FiChevronRight, FiTrendingUp, FiTrendingDown,
    FiDollarSign, FiActivity, FiArrowUpRight, FiArrowDownRight,
    FiGrid, FiPieChart, FiBarChart2, FiArrowLeft, FiShield,
    FiPlus, FiRefreshCw, FiCalendar
} from 'react-icons/fi';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, BarElement, PointElement, LineElement,
    ArcElement, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

ChartJS.register(
    CategoryScale, LinearScale, BarElement, PointElement, LineElement,
    ArcElement, Tooltip, Legend, Filler
);

/* ── helpers ── */
const fmt = (n) => {
    const v = n ?? 0;
    const abs = Math.abs(v);
    if (abs >= 10000000) return `${(v / 10000000).toFixed(1)}Cr`;
    if (abs >= 100000) return `${(v / 100000).toFixed(1)}L`;
    if (abs >= 1000) return `${(v / 1000).toFixed(1)}K`;
    return String(v);
};

/* ── Circular progress ring (SVG) ── */
function CircleRing({ pct, color, size = 68, stroke = 8 }) {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (pct / 100) * circ;
    const gradId = `vibrant-ring-${color.replace('#', '')}`;

    return (
        <svg width={size} height={size} className="circle-ring" style={{ overflow: 'visible' }}>
            <defs>
                <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={color} />
                    <stop offset="50%" stopColor={color} stopOpacity="0.8" />
                    <stop offset="100%" stopColor={color} />
                </linearGradient>
                <filter id="ring-3d-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke="rgba(0,0,0,0.3)" strokeWidth={stroke + 2} filter="blur(2px)" />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke="var(--bg-input)" strokeWidth={stroke} opacity="0.4" />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={`url(#${gradId})`} strokeWidth={stroke}
                strokeDasharray={circ} strokeDashoffset={offset}
                strokeLinecap="round"
                filter="url(#ring-3d-glow)"
                style={{
                    transition: 'stroke-dashoffset 2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
                transform={`rotate(-90 ${size / 2} ${size / 2})`} />
            <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle"
                fill="var(--text)" fontSize="14" fontWeight="900"
                style={{ letterSpacing: '-0.5px', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                {pct}%
            </text>
        </svg>
    );
}

export default function YearlyDashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { isDark } = useTheme();

    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [catType, setCatType] = useState('Expense');

    useEffect(() => {
        fetchYearlyData();
    }, [currentYear]);

    const fetchYearlyData = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/dashboard/yearly?year=${currentYear}`);
            setData(response.data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch yearly dashboard data:', err);
            setError('Failed to load yearly overview.');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !data) {
        return (
            <div className="page-loader">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page-empty">
                <p className="alert alert-error">{error}</p>
                <button onClick={fetchYearlyData} className="btn btn-primary mt-4">
                    <FiRefreshCw /> Try Again
                </button>
            </div>
        );
    }

    const {
        totalIncome, totalExpense, totalInvestment, monthlySummary,
        categoryWiseSpending, bankWiseSpending, onlineVsOfflineSummary,
        incomeCount, expenseCount, totalTransactionCount
    } = data;

    const balance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

    const MONTH_NAMES = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    // Chart Data
    const trendLabels = monthlySummary.map(m => MONTH_NAMES[m.month - 1]);
    const trendIncome = monthlySummary.map(m => m.income);
    const trendExpense = monthlySummary.map(m => m.expense);
    const trendInvestment = monthlySummary.map(m => m.investment);

    const trendData = {
        labels: trendLabels,
        datasets: [
            {
                label: 'Income',
                data: trendIncome,
                backgroundColor: '#10b981',
                borderRadius: 6,
                barPercentage: 0.6,
                categoryPercentage: 0.5,
            },
            {
                label: 'Expense',
                data: trendExpense,
                backgroundColor: '#ef4444',
                borderRadius: 6,
                barPercentage: 0.6,
                categoryPercentage: 0.5,
            },
            {
                label: 'Investment',
                data: trendInvestment,
                backgroundColor: '#c084fc',
                borderRadius: 6,
                barPercentage: 0.6,
                categoryPercentage: 0.5,
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(20, 24, 33, 0.95)',
                titleFont: { family: 'Inter', size: 14 },
                bodyFont: { family: 'Inter', size: 13 },
                padding: 12,
                cornerRadius: 8,
                displayColors: true,
                callbacks: {
                    label: (context) => ` ${context.dataset.label}: ₹${fmt(context.raw)}`
                }
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: isDark ? '#6b7394' : '#7c8298', font: { size: 11, family: 'Inter' } }
            },
            y: {
                grid: { color: isDark ? 'rgba(42, 49, 72, 0.12)' : 'rgba(0,0,0,0.05)', drawBorder: false },
                ticks: {
                    color: isDark ? '#6b7394' : '#7c8298',
                    font: { size: 11, family: 'Inter' },
                    callback: (value) => `₹${fmt(value)}`
                }
            }
        }
    };

    return (
        <div className="page">
            <div className="page-header" style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                        onClick={() => navigate('/')}
                        className="btn-icon"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', width: '40px', height: '40px', borderRadius: '12px' }}
                    >
                        <FiArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="page-title" style={{ margin: 0 }}>Yearly Overview</h1>
                        <p className="dashboard-subtitle">Comprehensive breakdown for {currentYear}</p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-card)', padding: '6px 8px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                    <button
                        onClick={() => setCurrentYear(prev => prev - 1)}
                        className="btn-icon"
                    >
                        <FiChevronLeft size={18} />
                    </button>
                    <span style={{ fontSize: '1.2rem', fontWeight: 800, padding: '0 12px', color: 'var(--primary)' }}>
                        {currentYear}
                    </span>
                    <button
                        onClick={() => setCurrentYear(prev => prev + 1)}
                        disabled={currentYear >= new Date().getFullYear()}
                        className="btn-icon"
                        style={{ opacity: currentYear >= new Date().getFullYear() ? 0.3 : 1 }}
                    >
                        <FiChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="stats-grid">
                <div className="stat-card" style={{ '--accent': '#818cf8' }}>
                    <div className="stat-icon"><FiDollarSign /></div>
                    <div style={{ flex: 1 }}>
                        <p className="stat-label">Net Savings</p>
                        <p className="stat-value">₹{fmt(balance)}</p>
                    </div>
                    <CircleRing pct={savingsRate > 0 ? Math.min(100, savingsRate) : 0} color="#818cf8" size={60} stroke={6} />
                </div>
                <div className="stat-card" style={{ '--accent': '#10b981' }}>
                    <div className="stat-icon"><FiTrendingUp /></div>
                    <div style={{ flex: 1 }}>
                        <p className="stat-label">Total Income</p>
                        <p className="stat-value">₹{fmt(totalIncome)}</p>
                    </div>
                    <CircleRing pct={100} color="#10b981" size={60} stroke={6} />
                </div>
                <div className="stat-card" style={{ '--accent': '#ef4444' }}>
                    <div className="stat-icon"><FiTrendingDown /></div>
                    <div style={{ flex: 1 }}>
                        <p className="stat-label">Total Expense</p>
                        <p className="stat-value">₹{fmt(totalExpense)}</p>
                    </div>
                    <CircleRing pct={totalIncome > 0 ? Math.min(100, Math.round((totalExpense / totalIncome) * 100)) : 100} color="#ef4444" size={60} stroke={6} />
                </div>
                <div className="stat-card" style={{ '--accent': '#c084fc' }}>
                    <div className="stat-icon"><FiActivity /></div>
                    <div style={{ flex: 1 }}>
                        <p className="stat-label">Investments</p>
                        <p className="stat-value">₹{fmt(totalInvestment)}</p>
                    </div>
                    <CircleRing pct={totalIncome > 0 ? Math.min(100, Math.round((totalInvestment / totalIncome) * 100)) : 0} color="#c084fc" size={60} stroke={6} />
                </div>
            </div>

            <div className="dash-mid-grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                {/* Yearly Trend Chart */}
                <div className="dash-panel">
                    <div className="dash-panel-header">
                        <span className="dash-panel-title"><FiBarChart2 /> Cash Flow Trend</span>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>12 Months</div>
                    </div>
                    <div style={{ height: '320px', marginTop: '20px' }}>
                        <Bar data={trendData} options={chartOptions} />
                    </div>
                    <div className="dash-chart-legend" style={{ marginTop: '16px' }}>
                        <span><span className="legend-dot" style={{ background: '#10b981' }} />Income</span>
                        <span><span className="legend-dot" style={{ background: '#ef4444' }} />Expense</span>
                        <span><span className="legend-dot" style={{ background: '#c084fc' }} />Investment</span>
                    </div>
                </div>

                {/* Categories Breakdown */}
                <div className="dash-panel">
                    <div className="dash-panel-header">
                        <span className="dash-panel-title"><FiGrid /> Yearly {catType} Breakdown</span>
                        <div className="dash-chart-toggle" style={{ transform: 'scale(0.85)', transformOrigin: 'right' }}>
                            <button className={`dash-toggle-btn ${catType === 'Expense' ? 'active-toggle' : ''}`} onClick={() => setCatType('Expense')}>Exp</button>
                            <button className={`dash-toggle-btn ${catType === 'Income' ? 'active-toggle' : ''}`} onClick={() => setCatType('Income')}>Inc</button>
                            <button className={`dash-toggle-btn ${catType === 'Investment' ? 'active-toggle' : ''}`} onClick={() => setCatType('Investment')}>Inv</button>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                        {categoryWiseSpending.filter(c => (c.categoryType || '').toLowerCase() === catType.toLowerCase()).slice(0, 6).map((cat, idx) => {
                            const palette = ['#818cf8', '#c084fc', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];
                            const color = palette[idx % palette.length];
                            const baseTotal = catType === 'Expense' ? (totalExpense || 1) : catType === 'Income' ? (totalIncome || 1) : (totalInvestment || 1);

                            return (
                                <div key={idx} style={{ display: 'flex', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px', width: '100%' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${color}20`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginRight: '12px' }}>
                                        {cat.icon || (catType === 'Investment' ? '🏦' : '📊')}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{cat.categoryName}</span>
                                                {catType === 'Investment' && <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(192, 132, 252, 0.1)', color: '#c084fc', borderRadius: '4px', fontWeight: 700 }}>INVESTMENT</span>}
                                            </div>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: color }}>₹{fmt(cat.total)}</span>
                                        </div>
                                        <div style={{ height: '4px', background: 'var(--bg-input)', borderRadius: '2px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', background: color, width: `${Math.min(100, (cat.total / baseTotal) * 100)}%` }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {categoryWiseSpending.filter(c => (c.categoryType || '').toLowerCase() === catType.toLowerCase()).length === 0 && <p style={{ textAlign: 'center', opacity: 0.5, padding: '20px' }}>No {catType.toLowerCase()} data found</p>}
                    </div>
                </div>
            </div>

            <div className="dash-mid-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginTop: '24px' }}>
                {/* Transaction Demographics */}
                <div className="dash-panel">
                    <div className="dash-panel-header">
                        <span className="dash-panel-title"><FiPieChart /> Payment Habits</span>
                    </div>
                    <div style={{ marginTop: '20px', spaceY: '20px' }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                <span>ONLINE</span>
                                <span>{Math.round((onlineVsOfflineSummary.onlineTotal / (onlineVsOfflineSummary.onlineTotal + onlineVsOfflineSummary.offlineTotal || 1)) * 100)}%</span>
                            </div>
                            <div style={{ height: '8px', background: 'var(--bg-input)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                                <div style={{ height: '100%', background: '#6366f1', width: `${(onlineVsOfflineSummary.onlineTotal / (onlineVsOfflineSummary.onlineTotal + onlineVsOfflineSummary.offlineTotal || 1)) * 100}%` }} />
                                <div style={{ height: '100%', background: '#f59e0b', flex: 1 }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                                <span>₹{fmt(onlineVsOfflineSummary.onlineTotal)}</span>
                                <span>₹{fmt(onlineVsOfflineSummary.offlineTotal)}</span>
                            </div>
                        </div>

                        <div style={{ marginTop: '32px' }}>
                            <p className="stat-label" style={{ marginBottom: '16px' }}>Top Payment Modes</p>
                            {bankWiseSpending.slice(0, 3).map((bank, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{bank.bankMode}</span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>₹{fmt(bank.total)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Yearly Summary Stats */}
                <div className="dash-panel">
                    <div className="dash-panel-header">
                        <span className="dash-panel-title"><FiActivity /> Volume Metrics</span>
                    </div>
                    <div style={{ marginTop: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                                    <FiArrowUpRight />
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Income Flows</p>
                                    <p style={{ fontSize: '1.2rem', fontWeight: 800 }}>{incomeCount} <span style={{ fontSize: '0.8rem', fontWeight: 400, opacity: 0.6 }}>Transactions</span></p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                                    <FiArrowDownRight />
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Expense Flows</p>
                                    <p style={{ fontSize: '1.2rem', fontWeight: 800 }}>{expenseCount} <span style={{ fontSize: '0.8rem', fontWeight: 400, opacity: 0.6 }}>Transactions</span></p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(192, 132, 252, 0.1)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                                    <FiActivity />
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Investment Flows</p>
                                    <p style={{ fontSize: '1.2rem', fontWeight: 800 }}>{data.investmentCount || 0} <span style={{ fontSize: '0.8rem', fontWeight: 400, opacity: 0.6 }}>Transactions</span></p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                                    <FiActivity />
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Activity</p>
                                    <p style={{ fontSize: '1.2rem', fontWeight: 800 }}>{totalTransactionCount} <span style={{ fontSize: '0.8rem', fontWeight: 400, opacity: 0.6 }}>Total Trans.</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Health Overview */}
                <div className="dash-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <FiShield size={48} style={{ color: savingsRate >= 0 ? 'var(--primary)' : '#ef4444', opacity: 0.1, position: 'absolute' }} />
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <p className="stat-label">Yearly Health Score</p>
                        <h2 style={{
                            fontSize: '3.5rem',
                            fontWeight: 900,
                            background: savingsRate >= 0 ? 'linear-gradient(135deg, var(--primary), #c084fc)' : 'linear-gradient(135deg, #ef4444, #f59e0b)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            margin: '10px 0'
                        }}>
                            {Math.max(0, Math.min(100, Math.round(savingsRate * 1.5)))}
                        </h2>

                        {savingsRate >= 10 ? (
                            <div style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <FiShield /> Financial Stability
                            </div>
                        ) : savingsRate >= 0 ? (
                            <div style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <FiActivity /> Attention Needed
                            </div>
                        ) : (
                            <div style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <FiActivity /> Financial Stress
                            </div>
                        )}

                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '16px', maxWidth: '220px', lineHeight: '1.4' }}>
                            {savingsRate >= 0
                                ? `Excellent work! You saved ${savingsRate}% of your income in ${currentYear}.`
                                : `Warning: Your expenses exceeded your income by ${Math.abs(savingsRate)}% in ${currentYear}.`}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
