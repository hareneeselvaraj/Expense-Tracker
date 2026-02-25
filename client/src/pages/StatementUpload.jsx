import { useState, useRef, useCallback } from 'react';
import { FiUploadCloud, FiFile, FiCheckCircle, FiAlertTriangle, FiX, FiCheck, FiLoader } from 'react-icons/fi';
import api from '../services/api';

export default function StatementUpload({ accounts, onImportSuccess, toast }) {
    const [file, setFile] = useState(null);
    const [accountId, setAccountId] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [preview, setPreview] = useState(null);
    const [selected, setSelected] = useState(new Set());
    const inputRef = useRef(null);

    // ── Drag & Drop handlers ──
    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
        else if (e.type === 'dragleave') setDragActive(false);
    }, []);

    const validateFile = (f) => {
        if (!f) return false;
        const ext = f.name.split('.').pop().toLowerCase();
        if (!['xlsx', 'xls', 'pdf'].includes(ext)) {
            toast.error('Unsupported file type. Please upload .xlsx, .xls, or .pdf');
            return false;
        }
        if (f.size > 10 * 1024 * 1024) {
            toast.error('File too large. Maximum size is 10 MB.');
            return false;
        }
        return true;
    };

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const dropped = e.dataTransfer.files?.[0];
        if (validateFile(dropped)) {
            setFile(dropped);
            setPreview(null);
        }
    }, []);

    const handleFileSelect = (e) => {
        const selected = e.target.files?.[0];
        if (validateFile(selected)) {
            setFile(selected);
            setPreview(null);
        }
    };

    // ── Parse uploaded file ──
    const handleParse = async () => {
        if (!file) return toast.error('Please select a file first.');
        if (!accountId) return toast.error('Please select an account.');

        setParsing(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/statement/parse', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const data = res.data;
            setPreview(data);

            // Auto-select non-duplicate rows
            const sel = new Set();
            data.rows.forEach((r) => {
                if (!r.isDuplicate) sel.add(r.rowIndex);
            });
            setSelected(sel);

            if (data.rows.length === 0) {
                toast.error('No transactions found in the file.');
            } else {
                toast.success(`Parsed ${data.rows.length} rows (${data.duplicateCount} duplicates).`);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to parse file.');
        } finally {
            setParsing(false);
        }
    };

    // ── Toggle row selection ──
    const toggleRow = (idx) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    const toggleAll = () => {
        if (!preview) return;
        if (selected.size === preview.rows.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(preview.rows.map((r) => r.rowIndex)));
        }
    };

    // ── Confirm import ──
    const handleConfirm = async () => {
        if (selected.size === 0) return toast.error('No rows selected.');
        if (!accountId) return toast.error('Please select an account.');

        setConfirming(true);
        try {
            const res = await api.post('/statement/confirm', {
                accountId,
                categoryId: null,
                selectedRowIndices: [...selected],
                rows: preview.rows,
            });
            const { inserted, skipped, message } = res.data;
            toast.success(message || `Imported ${inserted} transactions. ${skipped} skipped.`);
            onImportSuccess?.();
            // Reset state
            setFile(null);
            setPreview(null);
            setSelected(new Set());
        } catch (err) {
            toast.error(err.response?.data?.message || 'Import failed.');
        } finally {
            setConfirming(false);
        }
    };

    // ── Reset ──
    const handleReset = () => {
        setFile(null);
        setPreview(null);
        setSelected(new Set());
        setAccountId('');
        if (inputRef.current) inputRef.current.value = '';
    };

    const formatDate = (d) => {
        const dt = new Date(d);
        return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className="stmt-upload-card">
            <div className="stmt-upload-header">
                <h3>Upload Bank Statement</h3>
                <p className="stmt-subtitle">Drag & drop or browse for .xlsx, .xls, or .pdf files</p>
            </div>

            {/* ── Account Selector + File Info Row ── */}
            <div className="stmt-top-row">
                <div className="form-group stmt-account-select">
                    <label>Bank Account</label>
                    <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
                        <option value="">Select Account</option>
                        {accounts.map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                    </select>
                </div>
                {file && (
                    <div className="stmt-file-info">
                        <FiFile />
                        <span className="stmt-file-name">{file.name}</span>
                        <span className="stmt-file-size">({(file.size / 1024).toFixed(1)} KB)</span>
                        <button className="btn-icon stmt-file-remove" onClick={handleReset} title="Remove file">
                            <FiX />
                        </button>
                    </div>
                )}
            </div>

            {/* ── Dropzone ── */}
            {!preview && (
                <div
                    className={`stmt-dropzone ${dragActive ? 'stmt-dropzone-active' : ''} ${file ? 'stmt-dropzone-has-file' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".xlsx,.xls,.pdf"
                        onChange={handleFileSelect}
                        hidden
                    />
                    <FiUploadCloud className="stmt-dropzone-icon" />
                    <p className="stmt-dropzone-text">
                        {file ? file.name : 'Drop your bank statement here or click to browse'}
                    </p>
                    <span className="stmt-dropzone-hint">Supports Excel (.xlsx, .xls) and PDF files</span>
                </div>
            )}

            {/* ── Parse Button ── */}
            {file && !preview && (
                <div className="stmt-actions">
                    <button className="btn btn-primary stmt-parse-btn" onClick={handleParse} disabled={parsing || !accountId}>
                        {parsing ? (
                            <><FiLoader className="spin" /> Parsing…</>
                        ) : (
                            <><FiUploadCloud /> Parse Statement</>
                        )}
                    </button>
                </div>
            )}

            {/* ── Preview Table ── */}
            {preview && preview.rows.length > 0 && (
                <div className="stmt-preview-section">
                    <div className="stmt-preview-header">
                        <div className="stmt-preview-info">
                            <span className="stmt-preview-count">{preview.rows.length} transactions found</span>
                            {preview.duplicateCount > 0 && (
                                <span className="stmt-dup-summary">
                                    <FiAlertTriangle /> {preview.duplicateCount} duplicate{preview.duplicateCount > 1 ? 's' : ''}
                                </span>
                            )}
                            <span className="stmt-selected-count">{selected.size} selected</span>
                        </div>
                        <div className="stmt-preview-actions">
                            <button className="btn btn-ghost btn-sm" onClick={toggleAll}>
                                {selected.size === preview.rows.length ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                    </div>

                    <div className="stmt-table-wrap">
                        <table className="stmt-preview-table">
                            <thead>
                                <tr>
                                    <th className="stmt-th-check">
                                        <input
                                            type="checkbox"
                                            checked={selected.size === preview.rows.length}
                                            onChange={toggleAll}
                                        />
                                    </th>
                                    <th>#</th>
                                    <th>Date</th>
                                    <th>Description</th>
                                    <th className="stmt-th-amt">Amount</th>
                                    <th>Type</th>
                                    <th>Channel</th>
                                    <th>Mode</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {preview.rows.map((row) => (
                                    <tr
                                        key={row.rowIndex}
                                        className={`stmt-row ${selected.has(row.rowIndex) ? 'stmt-row-selected' : 'stmt-row-deselected'} ${row.isDuplicate ? 'stmt-row-dup' : ''}`}
                                        onClick={() => toggleRow(row.rowIndex)}
                                    >
                                        <td className="stmt-td-check">
                                            <input
                                                type="checkbox"
                                                checked={selected.has(row.rowIndex)}
                                                onChange={() => toggleRow(row.rowIndex)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </td>
                                        <td className="stmt-td-idx">{row.rowIndex + 1}</td>
                                        <td className="stmt-td-date">{formatDate(row.date)}</td>
                                        <td className="stmt-td-desc" title={row.description}>
                                            {row.description.length > 45 ? row.description.slice(0, 45) + '…' : row.description}
                                        </td>
                                        <td className={`stmt-td-amt ${row.type === 'Income' ? 'text-green' : 'text-red'}`}>
                                            {row.type === 'Income' ? '+' : '-'}₹{row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td>
                                            <span className={`stmt-type-badge ${row.type === 'Income' ? 'stmt-badge-income' : 'stmt-badge-expense'}`}>
                                                {row.type}
                                            </span>
                                        </td>
                                        <td>{row.channel}</td>
                                        <td>{row.bankMode || '—'}</td>
                                        <td>
                                            {row.isDuplicate ? (
                                                <span className="stmt-dup-badge"><FiAlertTriangle /> Duplicate</span>
                                            ) : (
                                                <span className="stmt-new-badge"><FiCheckCircle /> New</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Confirm Actions ── */}
                    <div className="stmt-confirm-bar">
                        <button className="btn btn-ghost" onClick={handleReset}>
                            <FiX /> Cancel
                        </button>
                        <button
                            className="btn btn-primary stmt-confirm-btn"
                            onClick={handleConfirm}
                            disabled={confirming || selected.size === 0}
                        >
                            {confirming ? (
                                <><FiLoader className="spin" /> Importing…</>
                            ) : (
                                <><FiCheck /> Confirm & Import ({selected.size})</>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* ── No results ── */}
            {preview && preview.rows.length === 0 && (
                <div className="stmt-no-results">
                    <FiAlertTriangle className="stmt-no-results-icon" />
                    <p>No transactions could be parsed from this file.</p>
                    <button className="btn btn-ghost" onClick={handleReset}>Try Another File</button>
                </div>
            )}
        </div>
    );
}
