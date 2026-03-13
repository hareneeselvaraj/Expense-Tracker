import { useState, useEffect, useMemo } from 'react';
import { FiArrowUp, FiArrowDown, FiCalendar, FiSearch, FiLayers, FiActivity, FiArrowRight } from 'react-icons/fi';
import api from '../services/api';

export default function History() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                const res = await api.get('/transaction');
                const sorted = res.data.sort((a, b) => new Date(b.date) - new Date(a.date));
                setTransactions(sorted);
            } catch (err) {
                console.error('Error fetching transactions:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchTransactions();
    }, []);

    // Global Statistics Calculation
    const globalStats = useMemo(() => {
        const income = transactions
            .filter(t => t.type?.toLowerCase() === 'income')
            .reduce((a, t) => a + (t.amount || 0), 0);
        const expense = transactions
            .filter(t => t.type?.toLowerCase() === 'expense')
            .reduce((a, t) => a + Math.abs(t.amount || 0), 0);
        return { income, expense, balance: income - expense };
    }, [transactions]);

    // Filtering & Grouping
    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx =>
            (tx.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (tx.categoryName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (tx.accountName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (tx.tagName || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [transactions, searchQuery]);

    const grouped = useMemo(() => {
        return filteredTransactions.reduce((acc, tx) => {
            const date = new Date(tx.date);
            const monthYear = date.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
            if (!acc[monthYear]) acc[monthYear] = [];
            acc[monthYear].push(tx);
            return acc;
        }, {});
    }, [filteredTransactions]);

    if (loading) return <div className="page-loader">Loading History...</div>;

    return (
        <div className="history-premium-page">
            {/* Premium Header Section */}
            <div className="premium-header-section">
                <div className="header-top">
                    <div>
                        <h1 className="premium-title"><FiLayers /> Transaction History</h1>
                        <p className="premium-subtitle">Manage and track your financial footprint across time</p>
                    </div>
                    <div className="premium-search-wrapper">
                        <FiSearch />
                        <input
                            type="text"
                            className="premium-search-input"
                            placeholder="Search by name, category, or account..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Global Stats Grid */}
                <div className="global-history-stats">
                    <div className="history-stat-card income">
                        <div className="h-stat-icon"><FiArrowUp /></div>
                        <div className="h-stat-content">
                            <p className="h-stat-label">Total Income</p>
                            <p className="h-stat-value">₹{globalStats.income.toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                    <div className="history-stat-card expense">
                        <div className="h-stat-icon"><FiArrowDown /></div>
                        <div className="h-stat-content">
                            <p className="h-stat-label">Total Expenses</p>
                            <p className="h-stat-value">₹{globalStats.expense.toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                    <div className="history-stat-card balance">
                        <div className="h-stat-icon"><FiActivity /></div>
                        <div className="h-stat-content">
                            <p className="h-stat-label">Net Difference</p>
                            <p className="h-stat-value">
                                {globalStats.balance < 0 ? '-' : ''}₹{Math.abs(globalStats.balance).toLocaleString('en-IN')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {Object.keys(grouped).length === 0 ? (
                <div className="premium-empty-state">
                    <div className="empty-visual"><FiCalendar /></div>
                    <h3>No transactions found</h3>
                    <p>We couldn't find any transactions matching your search criteria.</p>
                </div>
            ) : (
                Object.entries(grouped).map(([month, txs], groupIdx) => {
                    const monthIncome = txs.filter(t => t.type?.toLowerCase() === 'income').reduce((a, t) => a + (t.amount || 0), 0);
                    const monthExpense = txs.filter(t => t.type?.toLowerCase() === 'expense').reduce((a, t) => a + Math.abs(t.amount || 0), 0);

                    return (
                        <div className="month-section" key={month} style={{ animationDelay: `${groupIdx * 0.1}s` }}>
                            <div className="month-header-premium">
                                <h2 className="month-label">{month}</h2>
                                <div className="month-quick-summary">
                                    <span className="ms-item income"><FiArrowUp /> ₹{monthIncome.toLocaleString('en-IN')}</span>
                                    <span className="ms-item expense"><FiArrowDown /> ₹{monthExpense.toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                            <div className="tx-card-grid">
                                {txs.map((tx, txIdx) => (
                                    <div 
                                        className={`premium-tx-card ${tx.type?.toLowerCase()}`} 
                                        key={tx.id}
                                        style={{ animationDelay: `${(groupIdx * 0.1) + (txIdx * 0.05)}s` }}
                                    >
                                        <div className="tx-card-icon">
                                            {tx.categoryIcon || (tx.type === 'Income' ? '💰' : '💸')}
                                        </div>
                                        <div className="tx-card-main">
                                            <div className="tx-card-top">
                                                <h3 className="tx-card-title">{tx.description || tx.categoryName}</h3>
                                                <p className={`tx-card-amount ${tx.type?.toLowerCase() === 'income' ? 'plus' : 'minus'}`}>
                                                    {tx.type?.toLowerCase() === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                            <div className="tx-card-bottom">
                                                <div className="tx-card-tags">
                                                    <span className="tx-tag-pill account">{tx.accountName}</span>
                                                    <span className="tx-tag-pill category">{tx.categoryName}</span>
                                                    {tx.tagName && <span className="tx-tag-pill custom">{tx.tagName}</span>}
                                                </div>
                                                <p className="tx-card-date">
                                                    {new Date(tx.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}

