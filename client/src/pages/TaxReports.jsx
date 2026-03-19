import { useState, useEffect } from 'react';
import api from '../services/api';

export default function TaxReports() {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/portfolioanalytics/assets/All')
           .then(res => setAssets(res.data))
           .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="page-loader">Loading tax calculations...</div>;

    const totalLTCG = assets.reduce((acc, a) => acc + (a.ltcg || 0), 0);
    const totalSTCG = assets.reduce((acc, a) => acc + (a.stcg || 0), 0);
    
    // Simple mock tax math: 12.5% on LTCG over 1.25L, 20% on STCG (Indian budget 2024 proxy)
    const taxableLtcg = Math.max(0, totalLTCG - 125000);
    const approxTaxLtcg = taxableLtcg * 0.125;
    const approxTaxStcg = totalSTCG * 0.20;
    const totalTax = approxTaxLtcg + approxTaxStcg;

    const handleExportJSON = async () => {
        try {
            const res = await api.get('/export');
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", `wealth_backup_${new Date().toISOString().split('T')[0]}.json`);
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        } catch (err) {
            alert('Export failed');
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, color: 'var(--text-primary, #fff)', fontWeight: 800 }}>🏛 Tax Reports & Capital Gains</h2>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn outline" onClick={handleExportJSON}>💾 JSON Export</button>
                    <button className="btn outline" onClick={() => window.print()}>📥 Export PDF</button>
                </div>
            </div>

            {/* Estimated Tax Liability Section */}
            <div style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(245, 158, 11, 0.05))', borderRadius: '16px', padding: '2rem', marginBottom: '2rem', border: '1px solid rgba(239,68,68,0.2)' }}>
                <p style={{ margin: '0 0 8px 0', opacity: 0.8, fontSize: '0.9rem', fontWeight: 600, color: '#ef4444', textTransform: 'uppercase' }}>Estimated Tax Liability</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <h2 style={{ margin: 0, fontSize: '3rem', fontWeight: 900, color: '#ef4444' }}>₹{totalTax.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h2>
                    <div style={{ textAlign: 'right', fontSize: '0.9rem', opacity: 0.8 }}>
                        <p style={{ margin: 0 }}>LTCG Tax: ₹{approxTaxLtcg.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                        <p style={{ margin: 0 }}>STCG Tax: ₹{approxTaxStcg.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    </div>
                </div>
            </div>

            {/* Metrics Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ background: 'var(--card-bg, #1a1a2e)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color, #333)' }}>
                    <p style={{ margin: '0 0 8px 0', opacity: 0.7, fontSize: '0.9rem' }}>Realised LTCG (+1 Yr)</p>
                    <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>₹{totalLTCG.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h3>
                    <p style={{ margin: '8px 0 0 0', opacity: 0.5, fontSize: '0.8rem' }}>Exemption limit: ₹1,25,000 / year</p>
                </div>
                <div style={{ background: 'var(--card-bg, #1a1a2e)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color, #333)' }}>
                    <p style={{ margin: '0 0 8px 0', opacity: 0.7, fontSize: '0.9rem' }}>Realised STCG (-1 Yr)</p>
                    <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>₹{totalSTCG.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h3>
                    <p style={{ margin: '8px 0 0 0', opacity: 0.5, fontSize: '0.8rem' }}>Taxed at 20% flat rate</p>
                </div>
            </div>

            {/* Gains Breakdown Table */}
            <h3 style={{ marginTop: '1rem', marginBottom: '1rem', color: 'var(--text-primary)', fontWeight: 700 }}>Asset-wise Breakdown</h3>

            <div style={{ background: 'var(--card-bg, #1a1a2e)', borderRadius: '12px', padding: '0', border: '1px solid var(--border-color, #333)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                    <thead style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color, #333)' }}>
                        <tr>
                            <th style={{ padding: '1rem 1.25rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Asset Name</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Class</th>
                            <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>LTCG</th>
                            <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>STCG</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assets.filter(a => a.ltcg !== 0 || a.stcg !== 0).map((a, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border-color, #333)' }}>
                                <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>{a.name}</td>
                                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{a.assetType}</td>
                                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: a.ltcg >= 0 ? '#10b981' : '#ef4444' }}>₹{a.ltcg.toLocaleString('en-IN')}</td>
                                <td style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 600, color: a.stcg >= 0 ? '#f59e0b' : '#ef4444' }}>₹{a.stcg.toLocaleString('en-IN')}</td>
                            </tr>
                        ))}
                        {assets.filter(a => a.ltcg !== 0 || a.stcg !== 0).length === 0 && (
                            <tr>
                                <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No realised capital gains recorded yet. Sell assets to book gains/losses.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
