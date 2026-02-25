import { FiX, FiEdit2, FiTrash2 } from 'react-icons/fi';

export default function TransactionDrawer({ date, transactions, onClose, onEdit, onDelete }) {
    if (!date) return null;

    const income = transactions.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);

    return (
        <div className="cal-drawer-overlay" onClick={onClose}>
            <div className="cal-drawer" onClick={e => e.stopPropagation()}>
                <div className="cal-drawer-header">
                    <div>
                        <h3>{date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h3>
                        <div className="cal-drawer-summary">
                            <span className="cal-income-tag">+₹{income.toLocaleString('en-IN')}</span>
                            <span className="cal-expense-tag">-₹{expense.toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                    <button className="btn-icon" onClick={onClose}><FiX /></button>
                </div>

                <div className="cal-drawer-list">
                    {transactions.length === 0 ? (
                        <p className="cal-drawer-empty">No transactions on this day.</p>
                    ) : (
                        transactions.map(tx => (
                            <div key={tx.id} className="cal-drawer-item">
                                <div className="cal-drawer-item-left">
                                    <span className={`cal-drawer-dot ${tx.type === 'Income' ? 'dot-income' : tx.type === 'Expense' ? 'dot-expense' : 'dot-other'}`} />
                                    <div className="cal-drawer-item-info">
                                        <span className="cal-drawer-item-desc">
                                            {tx.description || tx.categoryName}
                                        </span>
                                        <span className="cal-drawer-item-meta">
                                            {tx.categoryName} · {tx.accountName}
                                            {tx.tagName ? ` · ${tx.tagName}` : ''}
                                        </span>
                                    </div>
                                </div>
                                <div className="cal-drawer-item-right">
                                    <span className={tx.type === 'Expense' ? 'text-red' : tx.type === 'Income' ? 'text-green' : ''}>
                                        {tx.type === 'Expense' ? '-' : '+'}₹{tx.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                    <div className="cal-drawer-item-actions">
                                        <button className="btn-icon" onClick={() => onEdit(tx)}><FiEdit2 /></button>
                                        <button className="btn-icon btn-icon-danger" onClick={() => onDelete(tx.id)}><FiTrash2 /></button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
