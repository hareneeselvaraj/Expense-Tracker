import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { useTheme } from '../context/ThemeContext';
import {
    FiTrendingUp, FiTrendingDown, FiDollarSign, FiPercent,
    FiClock, FiAward, FiInfo, FiArrowUp, FiArrowDown, FiActivity
} from 'react-icons/fi';

function fmt(v) {
    return `₹${(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtPct(v) {
    return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}

const PERF_CONFIG = {
    poor: { label: 'Poor', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', icon: <FiTrendingDown /> },
    moderate: { label: 'Moderate', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', icon: <FiActivity /> },
    good: { label: 'Good', color: '#10b981', bg: 'rgba(16,185,129,0.08)', icon: <FiTrendingUp /> },
    excellent: { label: 'Excellent', color: '#6366f1', bg: 'rgba(99,102,241,0.08)', icon: <FiAward /> },
};

function getPerf(annualizedReturn) {
    if (annualizedReturn > 18) return 'excellent';
    if (annualizedReturn > 10) return 'good';
    if (annualizedReturn > 5) return 'moderate';
    return 'poor';
}

function formatDuration(ms) {
    const totalMonths = Math.floor(ms / (1000 * 60 * 60 * 24 * 30.44));
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    if (years === 0 && months === 0) return 'Less than a month';
    const parts = [];
    if (years > 0) parts.push(`${years} year${years > 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} month${months > 1 ? 's' : ''}`);
    return parts.join(' ');
}

export default function InvestmentAnalysis({ investments }) {
    const { isDark } = useTheme();

    const analysis = useMemo(() => {
        if (!investments || investments.length === 0) return null;

        // ── Portfolio Summary ──
        const totalInvested = investments.reduce((s, i) => s + i.investedAmount, 0);
        const currentValue = investments.reduce((s, i) => s + i.currentValue, 0);
        const pnl = currentValue - totalInvested;
        const pnlPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

        // ── Duration Tracking ──
        const datesInvested = investments
            .filter(i => i.dateInvested)
            .map(i => new Date(i.dateInvested));
        const earliestDate = datesInvested.length > 0
            ? new Date(Math.min(...datesInvested))
            : null;
        const now = new Date();
        const durationMs = earliestDate ? now - earliestDate : 0;
        const durationStr = earliestDate ? formatDuration(durationMs) : 'Unknown';

        // ── Annualized Return ──
        // Weighted average holding period
        let weightedDays = 0;
        let totalWeight = 0;
        investments.forEach(inv => {
            if (inv.dateInvested) {
                const days = Math.max(1, (now - new Date(inv.dateInvested)) / (1000 * 60 * 60 * 24));
                weightedDays += days * inv.investedAmount;
                totalWeight += inv.investedAmount;
            }
        });
        const avgHoldingDays = totalWeight > 0 ? weightedDays / totalWeight : 365;
        const holdingYears = Math.max(avgHoldingDays / 365.25, 0.01);
        const totalReturn = totalInvested > 0 ? currentValue / totalInvested : 1;
        const annualizedReturn = totalReturn > 0
            ? (Math.pow(totalReturn, 1 / holdingYears) - 1) * 100
            : 0;
        const perfKey = getPerf(annualizedReturn);

        // ── Asset Type Analysis ──
        const assetMap = {};
        investments.forEach(inv => {
            const type = inv.assetType || 'Other';
            if (!assetMap[type]) assetMap[type] = { invested: 0, current: 0, count: 0 };
            assetMap[type].invested += inv.investedAmount;
            assetMap[type].current += inv.currentValue;
            assetMap[type].count += 1;
        });
        const assetTypes = Object.entries(assetMap)
            .map(([name, v]) => ({
                name,
                invested: v.invested,
                current: v.current,
                count: v.count,
                pnl: v.current - v.invested,
                roi: v.invested > 0 ? ((v.current - v.invested) / v.invested) * 100 : 0,
            }))
            .sort((a, b) => b.roi - a.roi);
        const bestAsset = assetTypes[0] || null;
        const worstAsset = assetTypes.length > 1 ? assetTypes[assetTypes.length - 1] : null;

        // ── Monthly Trend ──
        // Group investments by month invested, build cumulative trend
        const monthMap = {};
        investments.forEach(inv => {
            const d = inv.dateInvested ? new Date(inv.dateInvested) : now;
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!monthMap[key]) monthMap[key] = { invested: 0, current: 0 };
            monthMap[key].invested += inv.investedAmount;
            monthMap[key].current += inv.currentValue;
        });
        const sortedMonths = Object.keys(monthMap).sort();
        let cumInvested = 0, cumCurrent = 0;
        const trendData = sortedMonths.map(key => {
            cumInvested += monthMap[key].invested;
            cumCurrent += monthMap[key].current;
            const [y, m] = key.split('-');
            return { label: `${m}/${y}`, invested: cumInvested, current: cumCurrent };
        });

        // ── Detect Patterns ──
        const uniqueMonths = sortedMonths.length;
        const isConsistent = uniqueMonths >= 3;
        const isStagnant = Math.abs(pnlPct) < 2;
        const isDecline = pnlPct < -5;

        // ── Concentration check ──
        const maxAllocation = assetTypes.length > 0
            ? Math.max(...assetTypes.map(a => a.invested)) / totalInvested * 100
            : 0;
        const isConcentrated = maxAllocation > 60 && assetTypes.length > 1;

        // ── AI Insight Messages ──
        const messages = [];
        if (earliestDate) {
            messages.push({
                icon: <FiClock />,
                text: `You have been investing ${isConsistent ? 'consistently ' : ''}for ${durationStr}.`,
                color: '#6366f1',
            });
        }
        messages.push({
            icon: <FiPercent />,
            text: `Your annualized return of ${annualizedReturn.toFixed(1)}% is classified as ${PERF_CONFIG[perfKey].label.toLowerCase()} compared to typical market averages.`,
            color: PERF_CONFIG[perfKey].color,
        });
        if (bestAsset) {
            messages.push({
                icon: <FiArrowUp />,
                text: `${bestAsset.name} is your best performing asset type with ${fmtPct(bestAsset.roi)} return.`,
                color: '#10b981',
            });
        }
        if (worstAsset && worstAsset.roi < 0) {
            messages.push({
                icon: <FiArrowDown />,
                text: `${worstAsset.name} is underperforming at ${fmtPct(worstAsset.roi)}. Consider reviewing this allocation.`,
                color: '#ef4444',
            });
        }
        if (isConcentrated) {
            const topType = assetTypes[0];
            messages.push({
                icon: <FiInfo />,
                text: `${topType.name} accounts for ${maxAllocation.toFixed(0)}% of your portfolio. Consider diversifying.`,
                color: '#f59e0b',
            });
        }
        if (isStagnant && !isDecline) {
            messages.push({
                icon: <FiActivity />,
                text: `Your portfolio growth has been stagnant recently. Explore higher-yielding opportunities.`,
                color: '#f59e0b',
            });
        }
        if (isDecline) {
            messages.push({
                icon: <FiTrendingDown />,
                text: `Your portfolio has declined by ${Math.abs(pnlPct).toFixed(1)}%. Review underperforming assets.`,
                color: '#ef4444',
            });
        }

        return {
            totalInvested, currentValue, pnl, pnlPct,
            durationStr, earliestDate,
            annualizedReturn, perfKey,
            assetTypes, bestAsset, worstAsset,
            trendData,
            messages,
        };
    }, [investments]);

    if (!analysis) {
        return (
            <div className="ai-inv-empty">
                <FiTrendingUp />
                <p>No investments found. Add investments to see AI analysis.</p>
            </div>
        );
    }

    const { totalInvested, currentValue, pnl, pnlPct, durationStr, annualizedReturn, perfKey, assetTypes, bestAsset, worstAsset, trendData, messages } = analysis;
    const perfCfg = PERF_CONFIG[perfKey];

    // ── Trend Chart Config ──
    const s = typeof document !== 'undefined' ? getComputedStyle(document.documentElement) : null;
    const grid = s?.getPropertyValue('--chart-grid')?.trim() || 'rgba(255,255,255,0.04)';
    const tick = s?.getPropertyValue('--chart-tick')?.trim() || 'rgba(255,255,255,0.3)';
    const legend = s?.getPropertyValue('--chart-legend')?.trim() || 'rgba(255,255,255,0.5)';

    const trendChartData = {
        labels: trendData.map(d => d.label),
        datasets: [
            {
                label: 'Invested',
                data: trendData.map(d => d.invested),
                borderColor: isDark ? 'rgba(129,140,248,0.8)' : 'rgba(99,102,241,0.7)',
                backgroundColor: isDark ? 'rgba(129,140,248,0.06)' : 'rgba(99,102,241,0.06)',
                borderWidth: 2, tension: 0.4, pointRadius: trendData.length <= 2 ? 5 : 2,
                pointBackgroundColor: isDark ? 'rgba(129,140,248,0.8)' : 'rgba(99,102,241,0.7)',
                pointBorderColor: '#fff', pointBorderWidth: 1.5,
                fill: true,
            },
            {
                label: 'Current Value',
                data: trendData.map(d => d.current),
                borderColor: isDark ? 'rgba(110,191,164,0.8)' : 'rgba(5,150,105,0.7)',
                backgroundColor: isDark ? 'rgba(110,191,164,0.06)' : 'rgba(5,150,105,0.06)',
                borderWidth: 2, tension: 0.4, pointRadius: trendData.length <= 2 ? 5 : 2,
                pointBackgroundColor: isDark ? 'rgba(110,191,164,0.8)' : 'rgba(5,150,105,0.7)',
                pointBorderColor: '#fff', pointBorderWidth: 1.5,
                fill: true,
            },
        ],
    };

    const maxTrend = Math.max(...trendData.flatMap(d => [d.invested, d.current]), 0);
    const trendTickCb = maxTrend >= 100000
        ? (v) => `₹${(v / 100000).toFixed(1)}L`
        : maxTrend >= 1000
            ? (v) => `₹${(v / 1000).toFixed(0)}k`
            : (v) => `₹${v}`;

    const trendOpts = {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        layout: { padding: { top: 5 } },
        plugins: {
            legend: { position: 'bottom', labels: { color: legend, padding: 10, usePointStyle: true, pointStyleWidth: 6, boxHeight: 6, font: { size: 10, family: 'Inter', weight: '400' } } },
            tooltip: {
                callbacks: { label: (ctx) => `  ${ctx.dataset.label}: ${fmt(ctx.parsed.y)}` },
            },
        },
        scales: {
            x: { grid: { display: false }, border: { display: false }, ticks: { color: tick, font: { size: 9, family: 'Inter' }, maxRotation: 0 } },
            y: { beginAtZero: true, border: { display: false }, grid: { color: grid, drawBorder: false }, ticks: { color: tick, font: { size: 9, family: 'Inter' }, callback: trendTickCb, maxTicksLimit: 5 } },
        },
    };

    return (
        <div className="ai-inv-analysis">
            {/* ── Portfolio Summary Cards ── */}
            <div className="ai-overview-grid">
                <div className="ai-overview-card">
                    <div className="ai-ov-icon" style={{ color: '#6366f1', background: 'rgba(99,102,241,0.08)' }}><FiDollarSign /></div>
                    <div>
                        <p className="ai-ov-label">Total Invested</p>
                        <p className="ai-ov-value">{fmt(totalInvested)}</p>
                    </div>
                </div>
                <div className="ai-overview-card">
                    <div className="ai-ov-icon" style={{ color: '#818cf8', background: 'rgba(129,140,248,0.08)' }}><FiTrendingUp /></div>
                    <div>
                        <p className="ai-ov-label">Current Value</p>
                        <p className="ai-ov-value">{fmt(currentValue)}</p>
                    </div>
                </div>
                <div className="ai-overview-card">
                    <div className="ai-ov-icon" style={{ color: pnl >= 0 ? '#10b981' : '#ef4444', background: pnl >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)' }}>
                        {pnl >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
                    </div>
                    <div>
                        <p className="ai-ov-label">Profit / Loss</p>
                        <p className={`ai-ov-value ${pnl >= 0 ? 'text-green' : 'text-red'}`}>{pnl >= 0 ? '+' : ''}{fmt(pnl)}</p>
                    </div>
                </div>
                <div className="ai-overview-card">
                    <div className="ai-ov-icon" style={{ color: pnlPct >= 0 ? '#10b981' : '#ef4444', background: pnlPct >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)' }}><FiPercent /></div>
                    <div>
                        <p className="ai-ov-label">Overall Return</p>
                        <p className={`ai-ov-value ${pnlPct >= 0 ? 'text-green' : 'text-red'}`}>{fmtPct(pnlPct)}</p>
                    </div>
                </div>
            </div>

            {/* ── Performance Rating + Duration ── */}
            <div className="ai-inv-rating-row">
                <div className="ai-inv-rating-card">
                    <div className="ai-inv-rating-header">
                        <span className="ai-inv-rating-label">AI Performance Rating</span>
                        <span className="ai-inv-perf-badge" style={{ color: perfCfg.color, background: perfCfg.bg }}>
                            {perfCfg.icon} {perfCfg.label}
                        </span>
                    </div>
                    <div className="ai-inv-rating-detail">
                        <span className="ai-dim">Annualized Return</span>
                        <span className="ai-inv-rating-value" style={{ color: perfCfg.color }}>{fmtPct(annualizedReturn)}</span>
                    </div>
                    <div className="ai-inv-perf-bar-track">
                        <div
                            className="ai-inv-perf-bar-fill"
                            style={{
                                width: `${Math.min(Math.max(annualizedReturn, 0), 30) / 30 * 100}%`,
                                background: perfCfg.color
                            }}
                        />
                        {/* Threshold markers */}
                        <div className="ai-inv-perf-marker" style={{ left: `${5 / 30 * 100}%` }} title="5%"></div>
                        <div className="ai-inv-perf-marker" style={{ left: `${10 / 30 * 100}%` }} title="10%"></div>
                        <div className="ai-inv-perf-marker" style={{ left: `${18 / 30 * 100}%` }} title="18%"></div>
                    </div>
                    <div className="ai-inv-perf-labels">
                        <span>Poor</span><span>Moderate</span><span>Good</span><span>Excellent</span>
                    </div>
                </div>

                <div className="ai-inv-duration-card">
                    <div className="ai-inv-duration-icon"><FiClock /></div>
                    <div>
                        <p className="ai-ov-label">Investment Duration</p>
                        <p className="ai-ov-value">{durationStr}</p>
                        <p className="ai-dim" style={{ fontSize: '0.68rem', marginTop: '2px' }}>
                            {investments.length} investment{investments.length !== 1 ? 's' : ''} across {assetTypes.length} asset type{assetTypes.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── AI Insight Messages ── */}
            <div className="ai-section">
                <h3 className="ai-section-title"><FiInfo /> AI Insights</h3>
                <div className="ai-inv-insights">
                    {messages.map((msg, i) => (
                        <div key={i} className="ai-inv-insight-item">
                            <div className="ai-inv-insight-icon" style={{ color: msg.color, background: `${msg.color}12` }}>{msg.icon}</div>
                            <p className="ai-inv-insight-text">{msg.text}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Trend Chart ── */}
            {trendData.length > 0 && (
                <div className="ai-section">
                    <h3 className="ai-section-title"><FiActivity /> Portfolio Growth Trend</h3>
                    <div className="ai-inv-trend-card">
                        <div className="chart-container" style={{ height: '180px' }}>
                            <Line data={trendChartData} options={trendOpts} />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Allocation Intelligence ── */}
            {assetTypes.length > 0 && (
                <div className="ai-section">
                    <h3 className="ai-section-title"><FiAward /> Asset Type Performance</h3>
                    <div className="ai-inv-alloc-grid">
                        {assetTypes.map(a => {
                            const isPos = a.roi >= 0;
                            const maxRoi = Math.max(...assetTypes.map(x => Math.abs(x.roi)), 1);
                            const barW = Math.min(Math.abs(a.roi) / maxRoi * 100, 100);
                            const isBest = bestAsset && a.name === bestAsset.name;
                            const isWorst = worstAsset && a.name === worstAsset.name;
                            return (
                                <div key={a.name} className={`ai-inv-alloc-card ${isBest ? 'ai-inv-alloc-best' : ''} ${isWorst && a.roi < 0 ? 'ai-inv-alloc-worst' : ''}`}>
                                    <div className="ai-inv-alloc-header">
                                        <span className="ai-inv-alloc-name">
                                            {a.name}
                                            {isBest && <span className="ai-inv-alloc-tag" style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)' }}>Best</span>}
                                            {isWorst && a.roi < 0 && <span className="ai-inv-alloc-tag" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)' }}>Lowest</span>}
                                        </span>
                                        <span className={`ai-inv-alloc-roi ${isPos ? 'text-green' : 'text-red'}`}>{fmtPct(a.roi)}</span>
                                    </div>
                                    <div className="ai-bar-track">
                                        <div className="ai-bar-fill" style={{ width: `${barW}%`, background: isPos ? '#10b981' : '#ef4444' }} />
                                    </div>
                                    <div className="ai-inv-alloc-meta">
                                        <span>Invested: {fmt(a.invested)}</span>
                                        <span>Current: {fmt(a.current)}</span>
                                        <span>{a.count} asset{a.count !== 1 ? 's' : ''}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
