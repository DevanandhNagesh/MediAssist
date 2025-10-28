import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import '../styles/dashboard.scss';
import { 
  Activity, 
  Pill, 
  Search, 
  FileText, 
  Brain,
  AlertCircle,
  CheckCircle2,
  TrendingUp
} from 'lucide-react';
import '../styles/dashboard.scss';

const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await axios.get('/api/medicine-logs/stats');
      setStats(response.data.data.stats);
    } catch (error) {
      console.error('Failed to load stats', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getAdherenceColor = (score) => {
    if (score >= 90) return '#00D4C9';
    if (score >= 70) return '#ffc107';
    return '#dc3545';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#00D4C9';
      case 'low-stock': return '#ffc107';
      case 'out-of-stock': return '#dc3545';
      default: return '#6c757d';
    }
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div className="greeting-section">
          <h1>{getGreeting()}, {user?.name}! 👋</h1>
          <p>Here&apos;s your health overview</p>
        </div>
      </div>

      {/* Adherence Score Card */}
      <div className="adherence-card">
        <div className="adherence-content">
          <div className="adherence-info">
            <h3>Life Quality Adherence Score</h3>
            <p>Based on consistency and punctuality</p>
            {stats && (
              <div className="adherence-stats">
                <div className="stat-item">
                  <span className="stat-label">Doses Taken</span>
                  <span className="stat-value">{stats.totalDosesTaken}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">On-Time Rate</span>
                  <span className="stat-value">{stats.onTimeRate}%</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Active Medicines</span>
                  <span className="stat-value">{stats.activeMedicines}</span>
                </div>
              </div>
            )}
          </div>
          <div className="adherence-chart">
            {stats ? (
              <div className="circular-progress">
                <svg viewBox="0 0 120 120" className="progress-ring">
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="#e0e0e0"
                    strokeWidth="10"
                  />
                  {stats.overallAdherence !== null && (
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke={getAdherenceColor(stats.overallAdherence)}
                      strokeWidth="10"
                      strokeDasharray={`${(stats.overallAdherence / 100) * 314} 314`}
                      strokeLinecap="round"
                      transform="rotate(-90 60 60)"
                      className="progress-circle"
                    />
                  )}
                </svg>
                <div className="score-display">
                  {stats.overallAdherence !== null ? (
                    <>
                      <span className="score-number">{stats.overallAdherence}</span>
                      <span className="score-label">Score</span>
                    </>
                  ) : (
                    <>
                      <span className="score-number" style={{ fontSize: '1.5rem' }}>--</span>
                      <span className="score-label">No Data</span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="loading-placeholder">Loading...</div>
            )}
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="feature-grid">
        <Link to="/medicine-logs" className="feature-card">
          <div className="feature-icon" style={{ background: 'linear-gradient(135deg, #00D4C9 0%, #00a896 100%)' }}>
            <Pill size={28} />
          </div>
          <h3>Medicine Tracker</h3>
          <p>Log doses, track stock, and monitor adherence</p>
          {stats && stats.lowStockMedicines > 0 && (
            <div className="feature-badge warning">
              {stats.lowStockMedicines} low stock
            </div>
          )}
        </Link>

        <Link to="/prescription" className="feature-card">
          <div className="feature-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <FileText size={28} />
          </div>
          <h3>Prescription Scanner</h3>
          <p>Upload and analyze handwritten prescriptions</p>
        </Link>

        <Link to="/diagnosis" className="feature-card">
          <div className="feature-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <Activity size={28} />
          </div>
          <h3>Symptom Checker</h3>
          <p>Get AI-powered diagnosis from symptoms</p>
        </Link>

        <Link to="/knowledge" className="feature-card">
          <div className="feature-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <Brain size={28} />
          </div>
          <h3>Medical Knowledge</h3>
          <p>Search medical terms and information</p>
        </Link>
      </div>

      {/* Medicine Status Overview */}
      {stats && stats.medicineBreakdown && stats.medicineBreakdown.length > 0 && (
        <div className="medicines-overview">
          <div className="overview-header">
            <h2>Your Medicines</h2>
            <Link to="/medicine-logs" className="view-all-link">
              View All →
            </Link>
          </div>
          <div className="medicine-list">
            {stats.medicineBreakdown.slice(0, 5).map((medicine) => (
              <div key={medicine.id} className="medicine-item">
                <div className="medicine-info">
                  <div className="medicine-name-row">
                    <h4>{medicine.name}</h4>
                    <span 
                      className="status-badge"
                      style={{ 
                        background: getStatusColor(medicine.status),
                        color: 'white'
                      }}
                    >
                      {medicine.status === 'active' && <CheckCircle2 size={14} />}
                      {medicine.status === 'low-stock' && <AlertCircle size={14} />}
                      {medicine.status === 'out-of-stock' && <AlertCircle size={14} />}
                      <span>{medicine.status.replace('-', ' ')}</span>
                    </span>
                  </div>
                  <div className="medicine-details">
                    <span className="detail-item">
                      <TrendingUp size={14} />
                      Adherence: {medicine.adherenceScore}%
                    </span>
                    <span className="detail-item">
                      Stock: {medicine.stockRemaining} remaining
                    </span>
                    {medicine.predictedStockOut && (
                      <span className="detail-item warning-text">
                        Stock out: {new Date(medicine.predictedStockOut).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="adherence-mini">
                  <div 
                    className="mini-progress-bar"
                    style={{ 
                      width: `${medicine.adherenceScore}%`,
                      background: getAdherenceColor(medicine.adherenceScore)
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {stats && stats.totalMedicines === 0 && (
        <div className="empty-state">
          <Pill size={64} color="#00D4C9" />
          <h3>No medicines tracked yet</h3>
          <p>Start tracking your medicines to monitor adherence and stock levels</p>
          <Link to="/medicine-logs" className="btn btn-primary">
            Add Your First Medicine
          </Link>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
