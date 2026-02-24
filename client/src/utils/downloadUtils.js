import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Generate a professional bank-statement-style PDF from transactions
 */
export function downloadPDF(transactions, { title = 'Transaction Report', dateRange = '' } = {}) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    // ── Header ──
    doc.setFillColor(20, 24, 33);
    doc.rect(0, 0, pageW, 36, 'F');
    doc.setTextColor(232, 234, 240);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Expense Tracker', 16, 16);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 165, 190);
    doc.text(title, 16, 23);
    if (dateRange) doc.text(dateRange, 16, 29);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, pageW - 16, 16, { align: 'right' });

    // ── Summary ──
    const income = transactions.filter(t => t.type === 'Income').reduce((s, t) => s + (t.amount || 0), 0);
    const expense = transactions.filter(t => t.type === 'Expense').reduce((s, t) => s + (t.amount || 0), 0);
    const investment = transactions.filter(t => t.type === 'Investment').reduce((s, t) => s + (t.amount || 0), 0);
    const balance = income - expense - investment;
    const fmt = (v) => `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    const summaryY = 44;
    doc.setFillColor(245, 246, 250);
    doc.roundedRect(14, summaryY, pageW - 28, 22, 3, 3, 'F');
    doc.setTextColor(80, 85, 110);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const colW = (pageW - 28) / 4;
    const labels = ['Total Income', 'Total Expense', 'Investments', 'Net Balance'];
    const values = [fmt(income), fmt(expense), fmt(investment), fmt(balance)];
    const colors = [[16, 185, 129], [239, 68, 68], [245, 158, 11], [99, 102, 241]];
    labels.forEach((label, i) => {
        const x = 14 + colW * i + colW / 2;
        doc.setTextColor(100, 105, 130);
        doc.text(label, x, summaryY + 8, { align: 'center' });
        doc.setTextColor(...colors[i]);
        doc.setFontSize(10);
        doc.text(values[i], x, summaryY + 16, { align: 'center' });
        doc.setFontSize(8);
    });

    // ── Table ──
    const rows = transactions.map(t => [
        new Date(t.date).toLocaleDateString('en-IN'),
        (t.description || '—').substring(0, 40),
        t.categoryName || '—',
        t.onlineOffline + (t.bankMode ? ` · ${t.bankMode}` : ''),
        fmt(t.amount || 0),
        t.type,
    ]);

    autoTable(doc, {
        startY: summaryY + 28,
        head: [['Date', 'Description', 'Category', 'Payment Mode', 'Amount', 'Type']],
        body: rows,
        styles: {
            font: 'helvetica',
            fontSize: 8,
            cellPadding: 3,
            lineColor: [230, 232, 240],
            lineWidth: 0.2,
            textColor: [60, 65, 85],
        },
        headStyles: {
            fillColor: [32, 38, 56],
            textColor: [200, 205, 220],
            fontStyle: 'bold',
            fontSize: 7.5,
            halign: 'left',
        },
        alternateRowStyles: { fillColor: [248, 249, 252] },
        columnStyles: {
            0: { cellWidth: 22 },
            4: { halign: 'right', fontStyle: 'bold' },
            5: { cellWidth: 20 },
        },
        margin: { left: 14, right: 14 },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 5) {
                const val = data.cell.raw;
                if (val === 'Income') data.cell.styles.textColor = [16, 185, 129];
                else if (val === 'Expense') data.cell.styles.textColor = [220, 80, 80];
                else if (val === 'Investment') data.cell.styles.textColor = [210, 150, 50];
            }
        },
    });

    // ── Footer ──
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(160, 165, 190);
        doc.text(`Page ${i} of ${pageCount}`, pageW / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
    }

    doc.save(`transactions_${Date.now()}.pdf`);
}

/**
 * Generate an Excel workbook from transactions
 */
export function downloadExcel(transactions, { title = 'Transaction Report' } = {}) {
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const income = transactions.filter(t => t.type === 'Income').reduce((s, t) => s + (t.amount || 0), 0);
    const expense = transactions.filter(t => t.type === 'Expense').reduce((s, t) => s + (t.amount || 0), 0);
    const investment = transactions.filter(t => t.type === 'Investment').reduce((s, t) => s + (t.amount || 0), 0);

    const summaryData = [
        [title],
        [],
        ['Total Income', income],
        ['Total Expense', expense],
        ['Investments', investment],
        ['Net Balance', income - expense - investment],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    ws1['!cols'] = [{ wch: 20 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

    // Transactions sheet
    const rows = transactions.map(t => ({
        Date: new Date(t.date).toLocaleDateString('en-IN'),
        Description: t.description || '—',
        Category: t.categoryName || '—',
        Account: t.accountName || '—',
        'Payment Mode': t.onlineOffline + (t.bankMode ? ` · ${t.bankMode}` : ''),
        Amount: t.amount || 0,
        Type: t.type,
        Tag: t.tagName || '—',
    }));
    const ws2 = XLSX.utils.json_to_sheet(rows);
    ws2['!cols'] = [
        { wch: 12 }, { wch: 30 }, { wch: 16 }, { wch: 16 },
        { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'Transactions');

    XLSX.writeFile(wb, `transactions_${Date.now()}.xlsx`);
}

/**
 * Filter transactions by various criteria
 */
export function filterTransactions(transactions, { month, year, tagId, categoryId, paymentMode } = {}) {
    let filtered = [...transactions];

    if (year) {
        filtered = filtered.filter(t => new Date(t.date).getFullYear() === parseInt(year));
    }
    if (month) {
        filtered = filtered.filter(t => new Date(t.date).getMonth() + 1 === parseInt(month));
    }
    if (tagId) {
        filtered = filtered.filter(t => t.tagId === tagId);
    }
    if (categoryId) {
        filtered = filtered.filter(t => t.categoryId === categoryId);
    }
    if (paymentMode && paymentMode !== 'All') {
        if (paymentMode === 'Offline') {
            filtered = filtered.filter(t => t.onlineOffline === 'Offline');
        } else if (paymentMode === 'Credit') {
            filtered = filtered.filter(t => t.bankMode === 'Credit');
        } else if (paymentMode === 'Debit') {
            filtered = filtered.filter(t => t.bankMode === 'Debit');
        } else if (paymentMode === 'NetBanking') {
            filtered = filtered.filter(t => t.bankMode === 'NetBanking' || t.bankMode === 'GPay');
        }
    }

    return filtered;
}
