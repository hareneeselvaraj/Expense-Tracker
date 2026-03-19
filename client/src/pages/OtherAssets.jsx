import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiActivity, FiPieChart, FiGlobe, FiBriefcase, FiPlus } from 'react-icons/fi';
import { Doughnut } from 'react-chartjs-2';
import { useTheme } from '../context/ThemeContext';

export default function OtherAssets() {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const { theme } = useTheme();

    useEffect(() => {
        api.get('/portfolioanalytics/assets/Other')
           .then(res => setAssets(res.data))
           .finally(() => setLoading(false));
    }, []);

    const metrics = useMemo(() => {
        const totalInvested = assets.reduce((acc, a) => acc + a.investedAmount, 0);
        const currentValue = assets.reduce((acc, a) => acc + a.currentValue, 0);
        const overallPnL = assets.reduce((acc, a) => acc + a.overallPnL, 0);
        const overallPnLPct = totalInvested > 0 ? (overallPnL / totalInvested) * 100 : 0;
        return { totalInvested, currentValue, overallPnL, overallPnLPct };
    }, [assets]);

    const groupedAssets = useMemo(() => {
        return assets.reduce((acc, obj) => {
            const type = obj.assetType || 'Uncategorized';
            if (!acc[type]) acc[type] = [];
            acc[type].push(obj);
            return acc;
        }, {});
    }, [assets]);

    const chartData = useMemo(() => {
        const typeTotals = Object.entries(groupedAssets).map(([type, items]) => ({
            type,
            value: items.reduce((sum, item) => sum + item.currentValue, 0)
        })).sort((a, b) => b.value - a.value);

        return {
            labels: typeTotals.map(t => t.type),
            datasets: [{
                data: typeTotals.map(t => t.value),
                backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        };
    }, [groupedAssets]);

    if (loading) return <div className="page-loader">Loading alternative assets...</div>;

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h2 className="page-title">🏦 Alternative Assets</h2>
                    <p className="inv-subtitle">Consolidated view of your FDs, Real Estate, Gold, and other holdings.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={() => window.location.href='/investments?cat=Physical&showForm=true'} className="btn primary" style={{ gap: '6px' }}>
                        <FiPlus /> Add Asset
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
                    <div className="inv-sum-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
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
                    <div className="inv-sum-icon" style={{ background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4' }}>
                        <FiPieChart />
                    </div>
                    <div>
                        <div className="inv-sum-label">P&L %</div>
                        <div className="inv-sum-value" style={{ color: metrics.overallPnLPct >= 0 ? '#10b981' : '#ef4444' }}>
                            {metrics.overallPnLPct.toFixed(1)}%
                        </div>
                    </div>
                </div>
            </div>

            <div className="inv-mid-row">
                <div className="inv-chart-card">
                    <div className="inv-chart-title"><FiPieChart /> Asset Allocation</div>
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
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div className="inv-filters-card" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="inv-sum-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}><FiGlobe /></div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Diversification</div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Your wealth is spread across {Object.keys(groupedAssets).length} alternative asset types.</p>
                        </div>
                    </div>
                    <div className="inv-filters-card" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="inv-sum-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}><FiBriefcase /></div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Asset Health</div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>All alternative holdings are active and tracked with latest values.</p>
                        </div>
                    </div>
                </div>
            </div>

            {Object.entries(groupedAssets).map(([type, items]) => (
                <div key={type} style={{ marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>{type}</h3>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border)', opacity: 0.4 }}></div>
                    </div>
                    <div className="inv-table-card">
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Asset Name</th>
                                        <th className="text-right">Invested</th>
                                        <th className="text-right">Current Value</th>
                                        <th className="text-right">P&L (%)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((a, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 600 }}>{a.name}</td>
                                            <td className="text-right">₹{a.investedAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                                            <td className="text-right" style={{ fontWeight: 600 }}>₹{a.currentValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                                            <td className="text-right">
                                                <div style={{ color: a.overallPnL >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                                                    {a.overallPnL >= 0 ? '+' : ''}₹{Math.abs(a.overallPnL).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{a.overallPnLPct.toFixed(1)}%</div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
