import { FiChevronLeft, FiChevronRight, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { dateKey, isSameDay } from './calendarUtils';

export default function CalendarDayView({ selectedDate, onDateChange, dailyMap, onEdit, onDelete }) {
    const key = dateKey(selectedDate);
    const data = dailyMap[key];
    const transactions = data?.transactions || [];
    const income = data?.income || 0;
    const expense = data?.expense || 0;
    const net = income - expense;

    const prev = () => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() - 1);
        onDateChange(d);
    };
    const next = () => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + 1);
        onDateChange(d);
    };

    const isToday = isSameDay(selectedDate, new Date());

    return (
        <div className="cal-day-view">
            {/* Navigation */}
            <div className="cal-day-nav">
                <button className="btn-icon" onClick={prev}><FiChevronLeft /></button>
                <div className="cal-day-title">
                    <h3>{selectedDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h3>
                    {isToday && <span className="cal-today-pill">Today</span>}
                </div>
                <button className="btn-icon" onClick={next}><FiChevronRight /></button>
            </div>

            {/* Summary Cards */}
            <div className="cal-day-summary">
                <div className="cal-day-stat cal-day-stat-income">
                    <span className="cal-day-stat-label">Income</span>
                    <span className="cal-day-stat-value">₹{income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="cal-day-stat cal-day-stat-expense">
                    <span className="cal-day-stat-label">Expenses</span>
                    <span className="cal-day-stat-value">₹{expense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className={`cal-day-stat ${net >= 0 ? 'cal-day-stat-positive' : 'cal-day-stat-negative'}`}>
                    <span className="cal-day-stat-label">Net Balance</span>
                    <span className="cal-day-stat-value">{net >= 0 ? '+' : ''}₹{net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
            </div>

            {/* Transaction List */}
            <div className="cal-day-list">
                {transactions.length === 0 ? (
                    <p className="cal-empty-day">No transactions on this day.</p>
                ) : (
                    transactions.map(tx => (
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
                    ))
                )}
            </div>
        </div>
    );
}
