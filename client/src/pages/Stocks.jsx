import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiActivity, FiPieChart, FiPlus } from 'react-icons/fi';
import { Doughnut } from 'react-chartjs-2';
import { useTheme } from '../context/ThemeContext';

export default function Stocks() {
    const [stocks, setStocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const { theme } = useTheme();

    useEffect(() => {
        api.get('/portfolioanalytics/assets/Stock')
           .then(res => setStocks(res.data))
           .finally(() => setLoading(false));
    }, []);

    const metrics = useMemo(() => {
        const totalInvested = stocks.reduce((acc, s) => acc + s.investedAmount, 0);
        const currentValue = stocks.reduce((acc, s) => acc + s.currentValue, 0);
        const overallPnL = stocks.reduce((acc, s) => acc + s.overallPnL, 0);
        const overallPnLPct = totalInvested > 0 ? (overallPnL / totalInvested) * 100 : 0;
        return { totalInvested, currentValue, overallPnL, overallPnLPct };
    }, [stocks]);

    const chartData = useMemo(() => {
        const topStocks = [...stocks].sort((a, b) => b.currentValue - a.currentValue).slice(0, 5);
        const othersValue = stocks.length > 5 ? stocks.slice(5).reduce((acc, s) => acc + s.currentValue, 0) : 0;
        
        const labels = topStocks.map(s => s.name);
        if (othersValue > 0) labels.push('Others');
        
        const data = topStocks.map(s => s.currentValue);
        if (othersValue > 0) data.push(othersValue);

        return {
            labels,
            datasets: [{
                data,
                backgroundColor: [
                    '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        };
    }, [stocks]);

    if (loading) return <div className="page-loader">Loading stock portfolio...</div>;

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h2 className="page-title">📈 Stocks & Equity</h2>
                    <p className="inv-subtitle">Track your holdings, average prices, and real-time performance.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={() => window.location.href='/investments?cat=Market&showForm=true'} className="btn primary" style={{ gap: '6px' }}>
                        <FiPlus /> Add Stock
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="inv-summary-grid">
                <div className="inv-summary-card">
                    <div className="inv-sum-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                        <FiDollarSign />
                    </div>
                    <div>
                        <div className="inv-sum-label">Total Invested</div>
                        <div className="inv-sum-value">₹{metrics.totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                    </div>
                </div>
                <div className="inv-summary-card">
                    <div className="inv-sum-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                        <FiActivity />
                    </div>
                    <div>
                        <div className="inv-sum-label">Current Value</div>
                        <div className="inv-sum-value">₹{metrics.currentValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                    </div>
                </div>
                <div className="inv-summary-card">
                    <div className="inv-sum-icon" style={{ 
                        background: metrics.overallPnL >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                        color: metrics.overallPnL >= 0 ? '#10b981' : '#ef4444' 
                    }}>
                        {metrics.overallPnL >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
                    </div>
                    <div>
                        <div className="inv-sum-label">Overall P&L</div>
                        <div className="inv-sum-value" style={{ color: metrics.overallPnL >= 0 ? '#10b981' : '#ef4444' }}>
                            {metrics.overallPnL >= 0 ? '+' : ''}₹{Math.abs(metrics.overallPnL).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                    </div>
                </div>
                <div className="inv-summary-card">
                    <div className="inv-sum-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                        <FiPieChart />
                    </div>
                    <div>
                        <div className="inv-sum-label">Return %</div>
                        <div className="inv-sum-value" style={{ color: metrics.overallPnLPct >= 0 ? '#10b981' : '#ef4444' }}>
                            {metrics.overallPnLPct.toFixed(2)}%
                        </div>
                    </div>
                </div>
            </div>

            <div className="inv-mid-row">
                <div className="inv-chart-card">
                    <div className="inv-chart-title"><FiPieChart /> Portfolio Allocation</div>
                    <div className="inv-chart-wrap">
                        <Doughnut 
                            data={chartData} 
                            options={{
                                cutout: '70%',
                                plugins: { 
                                    legend: { display: false },
                                    centerText: {
                                        label: 'TOTAL',
                                        text: `₹${metrics.currentValue.toLocaleString('en-IN', { maximumFractionDigits: 0, notation: 'compact' })}`,
                                        color: '#fff'
                                    }
                                },
                                maintainAspectRatio: false
                            }} 
                        />
                    </div>
                </div>
                
                <div className="inv-table-card">
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Stock / Ticker</th>
                                    <th className="text-right">Qty</th>
                                    <th className="text-right">Avg Cost</th>
                                    <th className="text-right">Invested</th>
                                    <th className="text-right">Current Value</th>
                                    <th className="text-right">P&L (%)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stocks.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center" style={{ padding: '3rem', opacity: 0.5 }}>
                                            No stock holdings found.
                                        </td>
                                    </tr>
                                ) : (
                                    stocks.map((s, i) => (
                                        <tr key={i}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{s.name}</div>
                                                <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{s.ticker}</div>
                                            </td>
                                            <td className="text-right">{s.units}</td>
                                            <td className="text-right">₹{s.avgCost.toLocaleString('en-IN')}</td>
                                            <td className="text-right">₹{s.investedAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                                            <td className="text-right" style={{ fontWeight: 600 }}>₹{s.currentValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                                            <td className="text-right">
                                                <div style={{ color: s.overallPnL >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                                                    {s.overallPnL >= 0 ? '+' : '-'}₹{Math.abs(s.overallPnL).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{s.overallPnLPct.toFixed(2)}%</div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
