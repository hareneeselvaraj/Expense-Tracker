// ── Calendar Utilities ─────────────────────────────────────────

/** Get all days to render for a month grid (includes padding from prev/next month) */
export function getCalendarDays(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay(); // 0=Sun
    const days = [];

    // Previous month padding
    for (let i = startPad - 1; i >= 0; i--) {
        const d = new Date(year, month, -i);
        days.push({ date: d, isCurrentMonth: false });
    }
    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
        days.push({ date: new Date(year, month, d), isCurrentMonth: true });
    }
    // Next month padding (fill to 42 = 6 rows)
    while (days.length < 42) {
        const d = new Date(year, month + 1, days.length - startPad - lastDay.getDate() + 1);
        days.push({ date: d, isCurrentMonth: false });
    }
    // Trim trailing week if fully outside current month
    if (days.length > 35 && !days.slice(35).some(d => d.isCurrentMonth)) {
        days.length = 35;
    }
    return days;
}

/** Get the Sun-Sat week that contains the given date */
export function getWeekRange(date) {
    const d = new Date(date);
    const day = d.getDay();
    const start = new Date(d);
    start.setDate(d.getDate() - day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

/** Get 7 days of a week starting from startDate (Sunday) */
export function getWeekDays(startDate) {
    const days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        days.push(d);
    }
    return days;
}

/** Format date to YYYY-MM-DD key */
export function dateKey(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Group transactions by date key, pre-compute daily totals */
export function groupByDate(transactions) {
    const map = {};
    for (const tx of transactions) {
        const key = dateKey(tx.date);
        if (!map[key]) map[key] = { transactions: [], income: 0, expense: 0, categories: new Set() };
        map[key].transactions.push(tx);
        if (tx.type === 'Income') map[key].income += tx.amount;
        else if (tx.type === 'Expense') map[key].expense += tx.amount;
        if (tx.categoryName) map[key].categories.add(tx.categoryName);
    }
    // Convert sets to arrays
    for (const key of Object.keys(map)) {
        map[key].categories = [...map[key].categories];
        map[key].net = map[key].income - map[key].expense;
    }
    return map;
}

/** Compute summary for a set of transactions */
export function computeSummary(transactions) {
    let income = 0, expense = 0;
    for (const tx of transactions) {
        if (tx.type === 'Income') income += tx.amount;
        else if (tx.type === 'Expense') expense += tx.amount;
    }
    return { income, expense, savings: income - expense };
}

/** Check if two dates are the same calendar day */
export function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
}

/** Check if a date is today */
export function isToday(date) {
    return isSameDay(date, new Date());
}

/** Format a date range for display */
export function formatDateRange(start, end) {
    const opts = { day: 'numeric', month: 'short', year: 'numeric' };
    return `${start.toLocaleDateString('en-IN', opts)} – ${end.toLocaleDateString('en-IN', opts)}`;
}

/** Month names */
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
