import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Calendar, Clock, AlertTriangle, CheckCircle, X } from 'lucide-react';
import '../styles/medicine-logs.scss';

const MedicineLogsPage = () => {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDoseModal, setShowDoseModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [formData, setFormData] = useState({
    medicineName: '',
    dosageSchedule: {
      frequency: 'once-daily',
      times: ['08:00'],
      dosageAmount: '1 tablet'
    },
    expiryDate: '',
    stockQuantity: {
      current: 30,
      unit: 'tablets'
    },
    notes: ''
  });

  useEffect(() => {
    loadMedicines();
  }, []);

  const loadMedicines = async () => {
    try {
      const response = await axios.get('/api/medicine-logs');
      setMedicines(response.data.data.medicines);
    } catch (error) {
      console.error('Failed to load medicines', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMedicine = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/medicine-logs', formData);
      setShowAddModal(false);
      resetForm();
      loadMedicines();
    } catch (error) {
      console.error('Failed to add medicine', error);
      alert(error.response?.data?.message || 'Failed to add medicine');
    }
  };

  const handleLogDose = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/api/medicine-logs/${selectedMedicine._id}/dose`, {
        takenAt: new Date().toISOString(),
        quantity: 1
      });
      setShowDoseModal(false);
      setSelectedMedicine(null);
      loadMedicines();
    } catch (error) {
      console.error('Failed to log dose', error);
    }
  };

  const handleDeleteMedicine = async (id) => {
    if (!window.confirm('Are you sure you want to delete this medicine?')) return;
    
    try {
      await axios.delete(`/api/medicine-logs/${id}`);
      loadMedicines();
    } catch (error) {
      console.error('Failed to delete medicine', error);
    }
  };

  const resetForm = () => {
    setFormData({
      medicineName: '',
      dosageSchedule: {
        frequency: 'once-daily',
        times: ['08:00'],
        dosageAmount: '1 tablet'
      },
      expiryDate: '',
      stockQuantity: {
        current: 30,
        unit: 'tablets'
      },
      notes: ''
    });
  };

  const getStatusBadge = (medicine) => {
    const status = medicine.status;
    const colors = {
      active: { bg: '#d4edda', text: '#155724', icon: CheckCircle },
      'low-stock': { bg: '#fff3cd', text: '#856404', icon: AlertTriangle },
      'out-of-stock': { bg: '#f8d7da', text: '#721c24', icon: AlertTriangle },
      expired: { bg: '#f8d7da', text: '#721c24', icon: X }
    };
    
    const config = colors[status] || colors.active;
    const Icon = config.icon;
    
    return (
      <span className="status-badge" style={{ background: config.bg, color: config.text }}>
        <Icon size={14} />
        {status.replace('-', ' ')}
      </span>
    );
  };

  const getDaysUntilExpiry = (expiryDate) => {
    const days = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return <div className="loading-page">Loading medicines...</div>;
  }

  return (
    <div className="medicine-logs-page">
      <div className="page-header">
        <div>
          <h1>Medicine Tracker</h1>
          <p>Manage your medicines and track adherence</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={20} />
          Add Medicine
        </button>
      </div>

      {medicines.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💊</div>
          <h3>No medicines added yet</h3>
          <p>Start tracking your medicines to monitor doses and stock levels</p>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={20} />
            Add Your First Medicine
          </button>
        </div>
      ) : (
        <div className="medicines-grid">
          {medicines.map((medicine) => (
            <div key={medicine._id} className="medicine-card">
              <div className="medicine-card-header">
                <div>
                  <h3>{medicine.medicineName}</h3>
                  {getStatusBadge(medicine)}
                </div>
                <div className="card-actions">
                  <button 
                    className="btn-icon btn-primary"
                    onClick={() => {
                      setSelectedMedicine(medicine);
                      setShowDoseModal(true);
                    }}
                    title="Log Dose"
                  >
                    <CheckCircle size={18} />
                  </button>
                  <button 
                    className="btn-icon btn-danger"
                    onClick={() => handleDeleteMedicine(medicine._id)}
                    title="Delete"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="medicine-card-body">
                <div className="info-row">
                  <span className="info-label">Dosage:</span>
                  <span className="info-value">
                    {medicine.dosageSchedule.dosageAmount} - {medicine.dosageSchedule.frequency.replace('-', ' ')}
                  </span>
                </div>

                <div className="info-row">
                  <span className="info-label">Stock:</span>
                  <span className={`info-value ${medicine.stockQuantity.current < 10 ? 'warning' : ''}`}>
                    {medicine.stockQuantity.current} {medicine.stockQuantity.unit}
                  </span>
                </div>

                <div className="info-row">
                  <span className="info-label">Expiry:</span>
                  <span className={`info-value ${getDaysUntilExpiry(medicine.expiryDate) < 30 ? 'warning' : ''}`}>
                    <Calendar size={14} />
                    {new Date(medicine.expiryDate).toLocaleDateString()}
                    {getDaysUntilExpiry(medicine.expiryDate) < 30 && (
                      <span className="expiry-warning"> ({getDaysUntilExpiry(medicine.expiryDate)} days left)</span>
                    )}
                  </span>
                </div>

                <div className="adherence-section">
                  <div className="adherence-header">
                    <span>Adherence Score</span>
                    <span className="adherence-score">{medicine.adherenceScore}%</span>
                  </div>
                  <div className="adherence-bar">
                    <div 
                      className="adherence-fill"
                      style={{ 
                        width: `${medicine.adherenceScore}%`,
                        background: medicine.adherenceScore >= 90 ? '#00D4C9' : medicine.adherenceScore >= 70 ? '#ffc107' : '#dc3545'
                      }}
                    />
                  </div>
                </div>

                {medicine.predictions?.stockOutDate && (
                  <div className="prediction-alert">
                    <AlertTriangle size={14} />
                    Stock out predicted: {new Date(medicine.predictions.stockOutDate).toLocaleDateString()}
                  </div>
                )}

                {medicine.usageHistory && medicine.usageHistory.length > 0 && (
                  <div className="usage-summary">
                    <Clock size={14} />
                    Last dose: {new Date(medicine.usageHistory[medicine.usageHistory.length - 1].takenAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Medicine Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Medicine</h2>
              <button className="btn-close" onClick={() => setShowAddModal(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddMedicine} className="modal-form">
              <div className="form-group">
                <label>Medicine Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.medicineName}
                  onChange={(e) => setFormData({ ...formData, medicineName: e.target.value })}
                  required
                  placeholder="e.g., Aspirin, Paracetamol"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Frequency *</label>
                  <select
                    className="form-control"
                    value={formData.dosageSchedule.frequency}
                    onChange={(e) => setFormData({
                      ...formData,
                      dosageSchedule: { ...formData.dosageSchedule, frequency: e.target.value }
                    })}
                  >
                    <option value="once-daily">Once Daily</option>
                    <option value="twice-daily">Twice Daily</option>
                    <option value="thrice-daily">Thrice Daily</option>
                    <option value="as-needed">As Needed</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Dosage Amount *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.dosageSchedule.dosageAmount}
                    onChange={(e) => setFormData({
                      ...formData,
                      dosageSchedule: { ...formData.dosageSchedule, dosageAmount: e.target.value }
                    })}
                    placeholder="e.g., 1 tablet, 5ml"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Stock Quantity *</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.stockQuantity.current}
                    onChange={(e) => setFormData({
                      ...formData,
                      stockQuantity: { ...formData.stockQuantity, current: parseInt(e.target.value) }
                    })}
                    min="0"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Expiry Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  className="form-control"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
                  placeholder="Any additional notes..."
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Medicine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Dose Modal */}
      {showDoseModal && selectedMedicine && (
        <div className="modal-overlay" onClick={() => setShowDoseModal(false)}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Log Dose</h2>
              <button className="btn-close" onClick={() => setShowDoseModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <p>Are you logging a dose for <strong>{selectedMedicine.medicineName}</strong>?</p>
              <p className="text-muted">This will update your adherence score and stock quantity.</p>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowDoseModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleLogDose}>
                <CheckCircle size={18} />
                Confirm Dose
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicineLogsPage;
