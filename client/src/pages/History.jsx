import { useState } from 'react';
import { FiList, FiArrowUp, FiArrowDown } from 'react-icons/fi';

const sampleHistory = {
    'March 2026': [
        { id: 1, title: 'Salary', bank: 'BNP Bank', amount: 218000, type: 'income', date: 'Sat, 2 May', tag: 'salary_job', icon: '💼' },
        { id: 2, title: 'Grocery', bank: 'Citi Bank', amount: -23000, type: 'expense', date: 'Sun, 3 May', tag: 'AccountExpSvngs', icon: '🛒' },
        { id: 3, title: 'Home bills', bank: 'BNP Bank', amount: -75000, type: 'expense', date: 'Today, 4 May', tag: '#rent', icon: '🏠' },
        { id: 4, title: 'Sport', bank: 'Cash', amount: -3800, type: 'expense', date: 'Today, 4 May', tag: 'Gym', icon: '⚽' },
    ],
    'February 2026': [
        { id: 5, title: 'Freelance Payment', bank: 'HDFC Bank', amount: 85000, type: 'income', date: 'Thu, 28 Feb', tag: 'freelance', icon: '💻' },
        { id: 6, title: 'Electricity Bill', bank: 'Cash', amount: -4200, type: 'expense', date: 'Wed, 20 Feb', tag: 'utilities', icon: '⚡' },
        { id: 7, title: 'Netflix', bank: 'ICICI Bank', amount: -649, type: 'expense', date: 'Mon, 10 Feb', tag: 'subscription', icon: '🎬' },
        { id: 8, title: 'Salary', bank: 'BNP Bank', amount: 218000, type: 'income', date: 'Sat, 1 Feb', tag: 'salary_job', icon: '💼' },
    ],
    'January 2026': [
        { id: 9, title: 'Salary', bank: 'BNP Bank', amount: 218000, type: 'income', date: 'Wed, 1 Jan', tag: 'salary_job', icon: '💼' },
        { id: 10, title: 'Amazon Shopping', bank: 'HDFC Bank', amount: -12500, type: 'expense', date: 'Mon, 15 Jan', tag: 'shopping', icon: '📦' },
        { id: 11, title: 'Restaurant', bank: 'Cash', amount: -2800, type: 'expense', date: 'Fri, 10 Jan', tag: 'food', icon: '🍽️' },
    ],
};

export default function History() {
    const [months] = useState(sampleHistory);

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title"><FiList /> History</h1>
            </div>

            {Object.entries(months).map(([month, txs]) => {
                const income = txs.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
                const expense = txs.filter(t => t.type === 'expense').reduce((a, t) => a + Math.abs(t.amount), 0);
                return (
                    <div className="history-month-group" key={month}>
                        <div className="history-month-header">
                            <h2 className="history-month-title">{month}</h2>
                            <div className="history-month-summary">
                                <span style={{ color: '#10b981' }}><FiArrowUp /> ₹{income.toLocaleString()}</span>
                                <span style={{ color: '#ef4444' }}><FiArrowDown /> ₹{expense.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="history-tx-list">
                            {txs.map((tx) => (
                                <div className="history-tx-row" key={tx.id}>
                                    <div className="history-tx-icon">{tx.icon}</div>
                                    <div className="history-tx-info">
                                        <p className="history-tx-title">{tx.title}</p>
                                        <p className="history-tx-sub">{tx.bank} · {tx.tag}</p>
                                    </div>
                                    <div className="history-tx-right">
                                        <p className="history-tx-amount" style={{ color: tx.type === 'income' ? '#10b981' : '#ef4444' }}>
                                            {tx.type === 'income' ? '+' : ''}{(tx.amount / 100).toFixed(2)}$
                                        </p>
                                        <p className="history-tx-date">{tx.date}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
