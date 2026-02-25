import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { FiTruck, FiPlus, FiTrash2, FiEdit2, FiDroplet, FiMapPin, FiDollarSign, FiTrendingUp, FiAlertTriangle, FiChevronDown, FiX, FiActivity } from 'react-icons/fi';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

export default function MileageTracker() {
    const toast = useToast();
    const [vehicles, setVehicles] = useState([]);
    const [entries, setEntries] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeVehicle, setActiveVehicle] = useState(null);

    // Form states
    const [showVehicleForm, setShowVehicleForm] = useState(false);
    const [showEntryForm, setShowEntryForm] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState(null);
    const [editingEntry, setEditingEntry] = useState(null);

    const [vehicleForm, setVehicleForm] = useState({ name: '', vehicleType: 'Car', fuelType: 'Petrol', registrationNumber: '', serviceIntervalKm: '' });
    const [entryForm, setEntryForm] = useState({ vehicleId: '', date: new Date().toISOString().slice(0, 10), odometerReading: '', fuelQuantity: '', fuelCost: '', notes: '' });

    const loadData = useCallback(async () => {
        try {
            const [vRes, eRes, sRes] = await Promise.all([
                api.get('/mileage/vehicles'),
                api.get('/mileage/fuel-entries' + (activeVehicle ? `?vehicleId=${activeVehicle}` : '')),
                api.get('/mileage/summary')
            ]);
            setVehicles(vRes.data);
            setEntries(eRes.data);
            setSummary(sRes.data);
        } catch { toast.error('Failed to load data'); }
        setLoading(false);
    }, [activeVehicle, toast]);

    useEffect(() => { loadData(); }, [loadData]);

    // ── Vehicle CRUD ──
    const openVehicleForm = (v = null) => {
        if (v) {
            setEditingVehicle(v);
            setVehicleForm({ name: v.name, vehicleType: v.vehicleType, fuelType: v.fuelType, registrationNumber: v.registrationNumber || '', serviceIntervalKm: v.serviceIntervalKm || '' });
        } else {
            setEditingVehicle(null);
            setVehicleForm({ name: '', vehicleType: 'Car', fuelType: 'Petrol', registrationNumber: '', serviceIntervalKm: '' });
        }
        setShowVehicleForm(true);
    };

    const saveVehicle = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...vehicleForm, serviceIntervalKm: vehicleForm.serviceIntervalKm ? Number(vehicleForm.serviceIntervalKm) : null, registrationNumber: vehicleForm.registrationNumber || null };
            if (editingVehicle) {
                await api.put(`/mileage/vehicles/${editingVehicle.id}`, payload);
                toast.success('Vehicle updated');
            } else {
                await api.post('/mileage/vehicles', payload);
                toast.success('Vehicle added');
            }
            setShowVehicleForm(false);
            loadData();
        } catch { toast.error('Failed to save vehicle'); }
    };

    const deleteVehicle = async (id) => {
        try {
            await api.delete(`/mileage/vehicles/${id}`);
            toast.success('Vehicle deleted');
            if (activeVehicle === id) setActiveVehicle(null);
            loadData();
        } catch { toast.error('Failed to delete'); }
    };

    // ── Fuel Entry CRUD ──
    const openEntryForm = (entry = null) => {
        if (entry) {
            setEditingEntry(entry);
            setEntryForm({ vehicleId: entry.vehicleId, date: entry.date?.slice(0, 10), odometerReading: entry.odometerReading, fuelQuantity: entry.fuelQuantity, fuelCost: entry.fuelCost, notes: entry.notes || '' });
        } else {
            setEditingEntry(null);
            setEntryForm({ vehicleId: activeVehicle || (vehicles[0]?.id ?? ''), date: new Date().toISOString().slice(0, 10), odometerReading: '', fuelQuantity: '', fuelCost: '', notes: '' });
        }
        setShowEntryForm(true);
    };

    const saveEntry = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                vehicleId: entryForm.vehicleId,
                date: entryForm.date,
                odometerReading: Number(entryForm.odometerReading),
                fuelQuantity: Number(entryForm.fuelQuantity),
                fuelCost: Number(entryForm.fuelCost),
                notes: entryForm.notes || null
            };
            if (editingEntry) {
                await api.put(`/mileage/fuel-entries/${editingEntry.id}`, payload);
                toast.success('Entry updated');
            } else {
                await api.post('/mileage/fuel-entries', payload);
                toast.success('Fuel entry added');
            }
            setShowEntryForm(false);
            loadData();
        } catch { toast.error('Failed to save entry'); }
    };

    const deleteEntry = async (id) => {
        try {
            await api.delete(`/mileage/fuel-entries/${id}`);
            toast.success('Entry deleted');
            loadData();
        } catch { toast.error('Failed to delete'); }
    };

    // ── Computed price per liter ──
    const calcPPL = entryForm.fuelQuantity > 0 && entryForm.fuelCost > 0
        ? (Number(entryForm.fuelCost) / Number(entryForm.fuelQuantity)).toFixed(2) : '—';

    if (loading) return <div className="page-loader">Loading mileage data…</div>;

    // ── Trend Chart Data ──
    const trendData = summary?.monthlyTrend?.length > 0 ? {
        labels: summary.monthlyTrend.map(m => m.label),
        datasets: [
            {
                label: 'Avg Mileage (km/L)',
                data: summary.monthlyTrend.map(m => m.avgMileage),
                borderColor: '#818cf8',
                backgroundColor: 'rgba(129,140,248,0.08)',
                fill: true,
                tension: 0.35,
                pointRadius: 3,
                pointBackgroundColor: '#818cf8',
            },
            {
                label: 'Fuel Spent (₹)',
                data: summary.monthlyTrend.map(m => m.fuelSpent),
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245,158,11,0.08)',
                fill: true,
                tension: 0.35,
                pointRadius: 3,
                pointBackgroundColor: '#f59e0b',
                yAxisID: 'y1',
            }
        ]
    } : null;

    const trendOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'top', labels: { usePointStyle: true, padding: 16, font: { size: 11 } } } },
        scales: {
            y: { position: 'left', grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 10 } } },
            y1: { position: 'right', grid: { drawOnChartArea: false }, ticks: { font: { size: 10 } } },
            x: { grid: { display: false }, ticks: { font: { size: 10 } } }
        }
    };

    const alertIcon = { danger: '🔴', warning: '🟡', info: '🔵' };

    return (
        <div className="page mil-page">
            <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                <h1><FiTruck style={{ marginRight: 8 }} /> Mileage Tracker</h1>
            </div>

            {/* ── Summary Cards ── */}
            {summary && (
                <div className="mil-stats">
                    <div className="mil-stat-card">
                        <FiMapPin className="mil-stat-icon" />
                        <div><span className="mil-stat-label">Total Distance</span><span className="mil-stat-value">{summary.totalDistanceKm.toLocaleString('en-IN')} km</span></div>
                    </div>
                    <div className="mil-stat-card">
                        <FiDroplet className="mil-stat-icon" />
                        <div><span className="mil-stat-label">Fuel Spent</span><span className="mil-stat-value">₹{summary.totalFuelSpent.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</span></div>
                    </div>
                    <div className="mil-stat-card">
                        <FiTrendingUp className="mil-stat-icon" />
                        <div><span className="mil-stat-label">Avg Mileage</span><span className="mil-stat-value">{summary.avgMileage} km/L</span></div>
                    </div>
                    <div className="mil-stat-card">
                        <FiDollarSign className="mil-stat-icon" />
                        <div><span className="mil-stat-label">Cost / km</span><span className="mil-stat-value">₹{summary.costPerKm}</span></div>
                    </div>
                </div>
            )}

            {/* ── Alerts ── */}
            {summary?.alerts?.length > 0 && (
                <div className="mil-alerts">
                    {summary.alerts.map((a, i) => (
                        <div key={i} className={`mil-alert mil-alert-${a.severity}`}>
                            <span className="mil-alert-icon">{alertIcon[a.severity]}</span>
                            <span className="mil-alert-vehicle">{a.vehicleName}</span>
                            <span>{a.message}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Content Grid: Vehicles + Chart ── */}
            <div className="mil-content-grid">
                {/* Vehicles Panel */}
                <div className="mil-panel">
                    <div className="mil-panel-header">
                        <h3>Vehicles</h3>
                        <button className="btn btn-sm btn-primary" onClick={() => openVehicleForm()}><FiPlus /> Add</button>
                    </div>
                    {vehicles.length === 0 ? (
                        <p className="mil-empty">No vehicles yet. Add one to start tracking.</p>
                    ) : (
                        <div className="mil-vehicle-list">
                            <button className={`mil-vehicle-chip ${!activeVehicle ? 'active' : ''}`} onClick={() => setActiveVehicle(null)}>All</button>
                            {vehicles.map(v => (
                                <div key={v.id} className={`mil-vehicle-card ${activeVehicle === v.id ? 'active' : ''}`}>
                                    <div className="mil-vehicle-main" onClick={() => setActiveVehicle(activeVehicle === v.id ? null : v.id)}>
                                        <span className="mil-vehicle-emoji">{v.vehicleType === 'Car' ? '🚗' : '🏍️'}</span>
                                        <div className="mil-vehicle-info">
                                            <strong>{v.name}</strong>
                                            <span className="mil-vehicle-sub">{v.fuelType}{v.registrationNumber ? ` · ${v.registrationNumber}` : ''}</span>
                                        </div>
                                    </div>
                                    {summary?.vehicles?.find(sv => sv.vehicleId === v.id) && (
                                        <div className="mil-vehicle-stats">
                                            <span>{summary.vehicles.find(sv => sv.vehicleId === v.id).avgMileage} km/L</span>
                                            <span>{summary.vehicles.find(sv => sv.vehicleId === v.id).entryCount} entries</span>
                                        </div>
                                    )}
                                    <div className="mil-vehicle-actions">
                                        <button className="btn-icon" onClick={(e) => { e.stopPropagation(); openVehicleForm(v); }}><FiEdit2 /></button>
                                        <button className="btn-icon btn-icon-danger" onClick={(e) => { e.stopPropagation(); deleteVehicle(v.id); }}><FiTrash2 /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Trend Chart Panel */}
                <div className="mil-panel mil-chart-panel">
                    <div className="mil-panel-header">
                        <h3><FiActivity style={{ marginRight: 6 }} /> Mileage Trend</h3>
                    </div>
                    {trendData ? (
                        <div className="mil-chart-wrap">
                            <Line data={trendData} options={trendOptions} />
                        </div>
                    ) : (
                        <p className="mil-empty">Add at least 2 fuel entries to see trends.</p>
                    )}
                </div>
            </div>

            {/* ── Fuel Entries Table ── */}
            <div className="mil-panel mil-entries-panel">
                <div className="mil-panel-header">
                    <h3><FiDroplet style={{ marginRight: 6 }} /> Fuel Log</h3>
                    <button className="btn btn-sm btn-primary" onClick={() => openEntryForm()} disabled={vehicles.length === 0}><FiPlus /> Add Entry</button>
                </div>
                {entries.length === 0 ? (
                    <p className="mil-empty">No fuel entries yet.</p>
                ) : (
                    <div className="mil-table-wrap">
                        <table className="mil-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Vehicle</th>
                                    <th>Odometer</th>
                                    <th>Fuel (L)</th>
                                    <th>Cost (₹)</th>
                                    <th>₹/L</th>
                                    <th>Distance</th>
                                    <th>Mileage</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map(e => (
                                    <tr key={e.id}>
                                        <td>{new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                                        <td>{e.vehicleName}</td>
                                        <td>{e.odometerReading.toLocaleString('en-IN')} km</td>
                                        <td>{e.fuelQuantity}</td>
                                        <td>₹{e.fuelCost.toLocaleString('en-IN')}</td>
                                        <td>₹{e.pricePerLiter?.toFixed(2) ?? '—'}</td>
                                        <td>{e.distanceKm != null ? `${e.distanceKm} km` : '—'}</td>
                                        <td className={e.mileage ? 'mil-mileage-cell' : ''}>{e.mileage != null ? `${e.mileage} km/L` : '—'}</td>
                                        <td className="mil-actions-cell">
                                            <button className="btn-icon" onClick={() => openEntryForm(e)}><FiEdit2 /></button>
                                            <button className="btn-icon btn-icon-danger" onClick={() => deleteEntry(e.id)}><FiTrash2 /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Per-vehicle Summary Cards ── */}
            {summary?.vehicles?.length > 0 && (
                <div className="mil-vehicle-summary-grid">
                    {summary.vehicles.map(vs => (
                        <div key={vs.vehicleId} className="mil-vsummary-card">
                            <div className="mil-vsummary-header">
                                <span className="mil-vehicle-emoji">{vs.vehicleType === 'Car' ? '🚗' : '🏍️'}</span>
                                <strong>{vs.vehicleName}</strong>
                                <span className="mil-vsummary-type">{vs.fuelType}</span>
                            </div>
                            <div className="mil-vsummary-stats">
                                <div><span>Distance</span><strong>{vs.totalDistanceKm.toLocaleString('en-IN')} km</strong></div>
                                <div><span>Fuel Spent</span><strong>₹{vs.totalFuelSpent.toLocaleString('en-IN')}</strong></div>
                                <div><span>Avg Mileage</span><strong>{vs.avgMileage} km/L</strong></div>
                                <div><span>Cost/km</span><strong>₹{vs.costPerKm}</strong></div>
                                <div><span>Odometer</span><strong>{vs.latestOdometer.toLocaleString('en-IN')} km</strong></div>
                                <div><span>Entries</span><strong>{vs.entryCount}</strong></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Vehicle Form Modal ── */}
            {showVehicleForm && (
                <div className="mil-modal-overlay" onClick={() => setShowVehicleForm(false)}>
                    <div className="mil-modal" onClick={e => e.stopPropagation()}>
                        <div className="mil-modal-header">
                            <h3>{editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}</h3>
                            <button className="btn-icon" onClick={() => setShowVehicleForm(false)}><FiX /></button>
                        </div>
                        <form onSubmit={saveVehicle} className="mil-form">
                            <div className="mil-form-row">
                                <label>Vehicle Name *</label>
                                <input required value={vehicleForm.name} onChange={e => setVehicleForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. My Car" />
                            </div>
                            <div className="mil-form-row mil-form-row-2col">
                                <div>
                                    <label>Type *</label>
                                    <select value={vehicleForm.vehicleType} onChange={e => setVehicleForm(f => ({ ...f, vehicleType: e.target.value }))}>
                                        <option value="Car">🚗 Car</option>
                                        <option value="Bike">🏍️ Bike</option>
                                    </select>
                                </div>
                                <div>
                                    <label>Fuel *</label>
                                    <select value={vehicleForm.fuelType} onChange={e => setVehicleForm(f => ({ ...f, fuelType: e.target.value }))}>
                                        <option value="Petrol">Petrol</option>
                                        <option value="Diesel">Diesel</option>
                                        <option value="Electric">Electric</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mil-form-row mil-form-row-2col">
                                <div>
                                    <label>Reg. Number</label>
                                    <input value={vehicleForm.registrationNumber} onChange={e => setVehicleForm(f => ({ ...f, registrationNumber: e.target.value }))} placeholder="KA 01 AB 1234" />
                                </div>
                                <div>
                                    <label>Service Interval (km)</label>
                                    <input type="number" value={vehicleForm.serviceIntervalKm} onChange={e => setVehicleForm(f => ({ ...f, serviceIntervalKm: e.target.value }))} placeholder="e.g. 5000" />
                                </div>
                            </div>
                            <div className="mil-form-actions">
                                <button type="button" className="btn btn-outline" onClick={() => setShowVehicleForm(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">{editingVehicle ? 'Update' : 'Add Vehicle'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Fuel Entry Form Modal ── */}
            {showEntryForm && (
                <div className="mil-modal-overlay" onClick={() => setShowEntryForm(false)}>
                    <div className="mil-modal" onClick={e => e.stopPropagation()}>
                        <div className="mil-modal-header">
                            <h3>{editingEntry ? 'Edit Fuel Entry' : 'Log Fuel Entry'}</h3>
                            <button className="btn-icon" onClick={() => setShowEntryForm(false)}><FiX /></button>
                        </div>
                        <form onSubmit={saveEntry} className="mil-form">
                            {!editingEntry && (
                                <div className="mil-form-row">
                                    <label>Vehicle *</label>
                                    <select required value={entryForm.vehicleId} onChange={e => setEntryForm(f => ({ ...f, vehicleId: e.target.value }))}>
                                        <option value="">Select vehicle</option>
                                        {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="mil-form-row mil-form-row-2col">
                                <div>
                                    <label>Date *</label>
                                    <input type="date" required value={entryForm.date} onChange={e => setEntryForm(f => ({ ...f, date: e.target.value }))} />
                                </div>
                                <div>
                                    <label>Odometer (km) *</label>
                                    <input type="number" step="0.01" required value={entryForm.odometerReading} onChange={e => setEntryForm(f => ({ ...f, odometerReading: e.target.value }))} placeholder="e.g. 15230" />
                                </div>
                            </div>
                            <div className="mil-form-row mil-form-row-2col">
                                <div>
                                    <label>Fuel Quantity (L) *</label>
                                    <input type="number" step="0.01" required value={entryForm.fuelQuantity} onChange={e => setEntryForm(f => ({ ...f, fuelQuantity: e.target.value }))} placeholder="e.g. 30" />
                                </div>
                                <div>
                                    <label>Fuel Cost (₹) *</label>
                                    <input type="number" step="0.01" required value={entryForm.fuelCost} onChange={e => setEntryForm(f => ({ ...f, fuelCost: e.target.value }))} placeholder="e.g. 3000" />
                                </div>
                            </div>
                            {entryForm.fuelQuantity > 0 && entryForm.fuelCost > 0 && (
                                <div className="mil-form-computed">
                                    Price per liter: <strong>₹{calcPPL}</strong>
                                </div>
                            )}
                            <div className="mil-form-row">
                                <label>Notes</label>
                                <input value={entryForm.notes} onChange={e => setEntryForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
                            </div>
                            <div className="mil-form-actions">
                                <button type="button" className="btn btn-outline" onClick={() => setShowEntryForm(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">{editingEntry ? 'Update' : 'Log Entry'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
