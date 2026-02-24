import { useState } from 'react';
import { FiX, FiDownload, FiTag, FiGrid, FiCalendar, FiClock } from 'react-icons/fi';
import { filterTransactions, downloadPDF, downloadExcel } from '../utils/downloadUtils';

const MONTHS = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' }, { value: 4, label: 'April' },
    { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' },
    { value: 9, label: 'September' }, { value: 10, label: 'October' },
    { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

const PAYMENT_MODES = [
    { value: 'All', label: 'All Transactions' },
    { value: 'Credit', label: 'Credit Card' },
    { value: 'Debit', label: 'Debit Card' },
    { value: 'NetBanking', label: 'Internet Banking' },
    { value: 'Offline', label: 'Offline' },
];

function DownloadSection({ icon, title, children }) {
    return (
        <div className="dl-section">
            <h4 className="dl-section-title">{icon} {title}</h4>
            {children}
        </div>
    );
}

export default function DownloadCenter({ open, onClose, transactions = [], tags = [], categories = [] }) {
    const [tagId, setTagId] = useState('');
    const [catId, setCatId] = useState('');
    const [year, setYear] = useState('');
    const [month, setMonth] = useState('');
    const [payByTag, setPayByTag] = useState('All');
    const [payByCat, setPayByCat] = useState('All');
    const [payByYear, setPayByYear] = useState('All');
    const [payByMonth, setPayByMonth] = useState('All');

    // Derive available years from data
    const years = [...new Set(transactions.map(t => new Date(t.date).getFullYear()))].sort((a, b) => b - a);

    const doDownload = (format, filtered, title, dateRange) => {
        if (filtered.length === 0) return;
        if (format === 'pdf') downloadPDF(filtered, { title, dateRange });
        else downloadExcel(filtered, { title });
    };

    const handleDownload = (mode, format) => {
        let filtered, title, dateRange = '';

        switch (mode) {
            case 'tag': {
                filtered = filterTransactions(transactions, { tagId: tagId || undefined, paymentMode: payByTag });
                const tag = tags.find(t => t.id === tagId);
                title = tag ? `Transactions — Tag: ${tag.name}` : 'All Transactions';
                break;
            }
            case 'category': {
                filtered = filterTransactions(transactions, { categoryId: catId || undefined, paymentMode: payByCat });
                const cat = categories.find(c => c.id === catId);
                title = cat ? `Transactions — Category: ${cat.name}` : 'All Transactions';
                break;
            }
            case 'year': {
                filtered = filterTransactions(transactions, { year: year || undefined, paymentMode: payByYear });
                title = year ? `Transactions — Year ${year}` : 'All Transactions';
                dateRange = year ? `Year: ${year}` : '';
                break;
            }
            case 'month': {
                const selectedYear = year || new Date().getFullYear();
                filtered = filterTransactions(transactions, { month: month || undefined, year: selectedYear.toString(), paymentMode: payByMonth });
                const monthName = MONTHS.find(m => m.value === parseInt(month))?.label || '';
                title = month ? `Transactions — ${monthName} ${selectedYear}` : `Transactions — ${selectedYear}`;
                dateRange = month ? `${monthName} ${selectedYear}` : `Year: ${selectedYear}`;
                break;
            }
            default: filtered = transactions;
        }

        doDownload(format, filtered, title, dateRange);
    };

    return (
        <>
            <div className={`dl-overlay ${open ? 'dl-overlay-open' : ''}`} onClick={onClose} />
            <div className={`dl-panel ${open ? 'dl-panel-open' : ''}`}>
                <div className="dl-panel-header">
                    <h3><FiDownload /> Download Center</h3>
                    <button className="btn-icon" onClick={onClose}><FiX /></button>
                </div>

                <div className="dl-panel-body">
                    {/* By Tag */}
                    <DownloadSection icon={<FiTag />} title="Download by Tag">
                        <select className="dl-select" value={tagId} onChange={e => setTagId(e.target.value)}>
                            <option value="">All Tags</option>
                            {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <PaymentModeChips value={payByTag} onChange={setPayByTag} />
                        <DownloadButtons onDownload={(fmt) => handleDownload('tag', fmt)} />
                    </DownloadSection>

                    {/* By Category */}
                    <DownloadSection icon={<FiGrid />} title="Download by Category">
                        <select className="dl-select" value={catId} onChange={e => setCatId(e.target.value)}>
                            <option value="">All Categories</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <PaymentModeChips value={payByCat} onChange={setPayByCat} />
                        <DownloadButtons onDownload={(fmt) => handleDownload('category', fmt)} />
                    </DownloadSection>

                    {/* By Year */}
                    <DownloadSection icon={<FiCalendar />} title="Download by Year">
                        <select className="dl-select" value={year} onChange={e => setYear(e.target.value)}>
                            <option value="">All Years</option>
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <PaymentModeChips value={payByYear} onChange={setPayByYear} />
                        <DownloadButtons onDownload={(fmt) => handleDownload('year', fmt)} />
                    </DownloadSection>

                    {/* By Month */}
                    <DownloadSection icon={<FiClock />} title="Download by Month">
                        <div className="dl-row">
                            <select className="dl-select" value={month} onChange={e => setMonth(e.target.value)}>
                                <option value="">All Months</option>
                                {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                            <select className="dl-select" value={year} onChange={e => setYear(e.target.value)}>
                                <option value="">Year</option>
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <PaymentModeChips value={payByMonth} onChange={setPayByMonth} />
                        <DownloadButtons onDownload={(fmt) => handleDownload('month', fmt)} />
                    </DownloadSection>
                </div>
            </div>
        </>
    );
}

function PaymentModeChips({ value, onChange }) {
    return (
        <div className="dl-chips">
            {PAYMENT_MODES.map(pm => (
                <button
                    key={pm.value}
                    className={`dl-chip ${value === pm.value ? 'dl-chip-active' : ''}`}
                    onClick={() => onChange(pm.value)}
                >
                    {pm.label}
                </button>
            ))}
        </div>
    );
}

function DownloadButtons({ onDownload }) {
    return (
        <div className="dl-actions">
            <button className="dl-btn dl-btn-pdf" onClick={() => onDownload('pdf')}>
                <FiDownload /> PDF
            </button>
            <button className="dl-btn dl-btn-excel" onClick={() => onDownload('excel')}>
                <FiDownload /> Excel
            </button>
        </div>
    );
}
