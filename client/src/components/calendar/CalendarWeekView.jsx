import { useMemo } from 'react';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { getWeekDays, dateKey, isToday, DAY_NAMES } from './calendarUtils';

export default function CalendarWeekView({ weekStart, dailyMap, onEdit, onDelete }) {
    const days = useMemo(() => getWeekDays(weekStart), [weekStart]);

    // Aggregate week totals
    const weekTotals = useMemo(() => {
        let income = 0, expense = 0;
        for (const day of days) {
            const data = dailyMap[dateKey(day)];
            if (data) { income += data.income; expense += data.expense; }
        }
        return { income, expense, net: income - expense };
    }, [days, dailyMap]);

    return (
        <div className="cal-day-view">
            {/* Week Summary Cards */}
            <div className="cal-day-summary">
                <div className="cal-day-stat cal-day-stat-income">
                    <span className="cal-day-stat-label">Week Income</span>
                    <span className="cal-day-stat-value">₹{weekTotals.income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="cal-day-stat cal-day-stat-expense">
                    <span className="cal-day-stat-label">Week Expenses</span>
                    <span className="cal-day-stat-value">₹{weekTotals.expense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className={`cal-day-stat ${weekTotals.net >= 0 ? 'cal-day-stat-positive' : 'cal-day-stat-negative'}`}>
                    <span className="cal-day-stat-label">Net Balance</span>
                    <span className="cal-day-stat-value">{weekTotals.net >= 0 ? '+' : ''}₹{weekTotals.net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
            </div>

            {/* Day-by-day list */}
            <div className="cal-week-list">
                {days.map((day, i) => {
                    const key = dateKey(day);
                    const data = dailyMap[key];
                    const transactions = data?.transactions || [];
                    const today = isToday(day);

                    return (
                        <div key={i} className={`cal-week-day-section ${today ? 'cal-week-day-today' : ''}`}>
                            {/* Day Header */}
                            <div className="cal-week-day-header">
                                <div className="cal-week-day-label">
                                    <span className={`cal-week-day-date ${today ? 'cal-today-badge' : ''}`}>
                                        {day.getDate()}
                                    </span>
                                    <span className="cal-week-day-name-lbl">{DAY_NAMES[i]}</span>
                                    <span className="cal-week-day-month">{day.toLocaleDateString('en-IN', { month: 'short' })}</span>
                                    {today && <span className="cal-today-pill">Today</span>}
                                </div>
                                {data && (
                                    <div className="cal-week-day-totals">
                                        {data.income > 0 && <span className="cal-income-tag">+₹{data.income.toLocaleString('en-IN')}</span>}
                                        {data.expense > 0 && <span className="cal-expense-tag">-₹{data.expense.toLocaleString('en-IN')}</span>}
                                    </div>
                                )}
                            </div>

                            {/* Transaction Rows */}
                            {transactions.length === 0 ? (
                                <div className="cal-week-day-empty">No transactions</div>
                            ) : (
                                <div className="cal-day-list">
                                    {transactions.map(tx => (
                                        <div key={tx.id} className="cal-day-tx-row">
                                            <span className={`cal-drawer-dot ${tx.type === 'Income' ? 'dot-income' : tx.type === 'Expense' ? 'dot-expense' : 'dot-other'}`} />
                                            <div className="cal-day-tx-info">
                                                <span className="cal-day-tx-desc">{tx.description || tx.categoryName}</span>
                                                <span className="cal-day-tx-meta">
                                                    {tx.categoryName} · {tx.accountName}
                                                    {tx.onlineOffline ? ` · ${tx.onlineOffline}` : ''}
                                                    {tx.bankMode ? ` · ${tx.bankMode}` : ''}
                                                    {tx.tagName ? ` · ${tx.tagName}` : ''}
                                                </span>
                                            </div>
                                            <span className={`cal-day-tx-amt ${tx.type === 'Expense' ? 'text-red' : tx.type === 'Income' ? 'text-green' : ''}`}>
                                                {tx.type === 'Expense' ? '-' : '+'}₹{tx.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </span>
                                            <div className="cal-day-tx-actions">
                                                <button className="btn-icon" onClick={() => onEdit(tx)}><FiEdit2 /></button>
                                                <button className="btn-icon btn-icon-danger" onClick={() => onDelete(tx.id)}><FiTrash2 /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
