import { useMemo, useState } from 'react';
import { getCalendarDays, dateKey, isToday, DAY_NAMES } from './calendarUtils';
import TransactionDrawer from './TransactionDrawer';

export default function CalendarMonthView({ year, month, dailyMap, onEdit, onDelete }) {
    const [drawerDate, setDrawerDate] = useState(null);
    const days = useMemo(() => getCalendarDays(year, month), [year, month]);

    const drawerTx = drawerDate ? (dailyMap[dateKey(drawerDate)]?.transactions || []) : [];

    return (
        <>
            <div className="cal-grid">
                {/* Day-of-week headers */}
                {DAY_NAMES.map(d => (
                    <div key={d} className="cal-header-cell">{d}</div>
                ))}

                {/* Date cells */}
                {days.map((day, i) => {
                    const key = dateKey(day.date);
                    const data = dailyMap[key];
                    const today = isToday(day.date);
                    const hasOverspend = data && data.expense > data.income && data.income > 0;

                    return (
                        <div
                            key={i}
                            className={`cal-cell ${!day.isCurrentMonth ? 'cal-cell-outside' : ''} ${today ? 'cal-cell-today' : ''} ${hasOverspend ? 'cal-cell-overspend' : ''} ${data ? 'cal-cell-has-data' : ''}`}
                            onClick={() => day.isCurrentMonth && setDrawerDate(day.date)}
                        >
                            <span className="cal-cell-date">{day.date.getDate()}</span>
                            {data && day.isCurrentMonth && (
                                <div className="cal-cell-body">
                                    {data.expense > 0 && (
                                        <span className="cal-cell-expense">-₹{formatShort(data.expense)}</span>
                                    )}
                                    {data.income > 0 && (
                                        <span className="cal-cell-income">+₹{formatShort(data.income)}</span>
                                    )}
                                    {data.categories.length > 0 && (
                                        <div className="cal-cell-dots">
                                            {data.categories.slice(0, 4).map((c, j) => (
                                                <span key={j} className="cal-cat-dot" title={c} style={{ background: getCatColor(j) }} />
                                            ))}
                                            {data.categories.length > 4 && <span className="cal-cat-more">+{data.categories.length - 4}</span>}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {drawerDate && (
                <TransactionDrawer
                    date={drawerDate}
                    transactions={drawerTx}
                    onClose={() => setDrawerDate(null)}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            )}
        </>
    );
}

function formatShort(n) {
    if (n >= 100000) return (n / 100000).toFixed(1) + 'L';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toLocaleString('en-IN');
}

const CAT_COLORS = ['#818cf8', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#06b6d4', '#8b5cf6', '#f97316'];
function getCatColor(index) { return CAT_COLORS[index % CAT_COLORS.length]; }
