import { useState } from 'react';
import { Badge } from 'react-bootstrap';
import PrescriptionUpload from '../components/forms/PrescriptionUpload.jsx';
import ErrorAlert from '../components/shared/ErrorAlert.jsx';
import useApi from '../hooks/useApi.js';
import '../styles/prescription.scss';

const PrescriptionPage = () => {
  const api = useApi();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpload = async(file) => {
    const formData = new FormData();
    formData.append('prescription', file);

    try {
      setLoading(true);
      setError(null);
      const { data } = await api.post('/prescriptions/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setResult(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="prescription-page">
      <header className="page-header mb-4">
        <h1>Prescription Insight Module</h1>
        <p>Decode handwritten prescriptions into structured, easy-to-understand medicine information.</p>
      </header>

      {error && <ErrorAlert message={error.message} />}

      {result?.message && !result?.medicines?.length && (
        <div className="alert alert-info mt-4" role="alert">
          {result.message}
        </div>
      )}

      <div className="upload-card">
        <PrescriptionUpload onUpload={handleUpload} loading={loading} />
      </div>

      {result && (
        <div className="results-card">
          {/* Prescription Explanation Section */}
          {result.explanation && (
            <div className="explanation-section mb-4">
              <h3 className="mb-3">📋 Prescription Explanation</h3>
              <div className="explanation-content">
                <pre style={ { whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '1rem', lineHeight: '1.6', color: '#6c757d' } }>
                  {result.explanation}
                </pre>
              </div>
            </div>
          )}

          {/* Identified Medicines Section */}
          {result.medicines?.length > 0 && (
            <div className="medicines-section">
              <h3 className="mb-3">💊 Identified Medicines - Detailed Information</h3>
                {result.medicines.map((medicine, index) => (
                  <div key={`${medicine.name}-${index}`} className={`medicine-card mb-3 ${medicine.isBasicInfo ? 'basic-info-card' : ''}`}>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                          <h4 className="text-primary mb-2">{medicine.name}</h4>
                          <div className="d-flex gap-2 flex-wrap">
                            {medicine.isBasicInfo ? (
                              <Badge bg="info">Detected - Limited Info</Badge>
                            ) : (
                              <>
                                {medicine.matchScore > 0 && (
                                  <Badge bg={medicine.matchScore >= 90 ? 'success' : medicine.matchScore >= 70 ? 'warning' : 'secondary'}>
                                    {medicine.matchScore}% confidence
                                  </Badge>
                                )}
                                {medicine.habit_forming && medicine.habit_forming.toLowerCase() !== 'no' && medicine.habit_forming.toLowerCase() !== 'unknown' && (
                                  <Badge bg="danger">Habit Forming</Badge>
                                )}
                              </>
                            )}
                          </div>
                          {medicine.detectedAs && (
                            <p className="mb-0 text-muted small mt-2">
                              <em>Detected as: &ldquo;{medicine.detectedAs}&rdquo;</em>
                            </p>
                          )}
                        </div>
                        {medicine.price && medicine.price !== 'Not available' && (
                          <div className="text-end">
                            <h5 className="text-success mb-0">₹{medicine.price}</h5>
                            <small className="text-muted">MRP</small>
                          </div>
                        )}
                      </div>

                      {/* Show message for basic info medicines */}
                      {medicine.isBasicInfo && (
                        <div className="alert alert-info mb-3">
                          <strong>ℹ️ Medicine Detected:</strong> This medicine was identified in your prescription but detailed information is not available in our database. Please consult your doctor or pharmacist for complete information.
                        </div>
                      )}

                      {/* Show full info only for matched medicines */}
                      {!medicine.isBasicInfo && (
                        <>
                          <div className="row">
                            {/* Uses Section */}
                            {medicine.uses?.length > 0 && (
                              <div className="col-md-6 mb-3">
                                <div className="info-card h-100 border-success">
                                  <div className="info-card-header bg-light">
                                    <strong className="text-success">✓ Uses & Benefits</strong>
                                  </div>
                                  <div className="info-card-body">
                                    <ul className="mb-0">
                                      {medicine.uses.slice(0, 5).map((use, idx) => (
                                        <li key={idx} className="mb-1">{use}</li>
                                      ))}
                                      {medicine.uses.length > 5 && (
                                        <li className="text-muted">
                                          <em>+{medicine.uses.length - 5} more uses</em>
                                        </li>
                                      )}
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Side Effects Section */}
                            {medicine.side_effects?.length > 0 && (
                              <div className="col-md-6 mb-3">
                                <div className="info-card h-100 border-danger">
                                  <div className="info-card-header bg-light">
                                    <strong className="text-danger">⚠ Side Effects</strong>
                                  </div>
                                  <div className="info-card-body">
                                    <ul className="mb-0">
                                      {medicine.side_effects.slice(0, 5).map((effect, idx) => (
                                        <li key={idx} className="mb-1">{effect}</li>
                                      ))}
                                      {medicine.side_effects.length > 5 && (
                                        <li className="text-muted">
                                          <em>+{medicine.side_effects.length - 5} more side effects</em>
                                        </li>
                                      )}
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Additional Information */}
                          <div className="row mt-2">
                            <div className="col-md-12">
                              <div className="p-3 bg-light rounded">
                                {medicine.manufacturer && medicine.manufacturer !== 'Not available' && (
                                  <p className="mb-2">
                                    <strong>🏭 Manufacturer:</strong> {medicine.manufacturer}
                                  </p>
                                )}
                                {medicine.chemical_class && medicine.chemical_class !== 'Not available' && (
                                  <p className="mb-2">
                                    <strong>🧪 Chemical Class:</strong> {medicine.chemical_class}
                                  </p>
                                )}
                                {medicine.therapeutic_class && medicine.therapeutic_class !== 'Not available' && (
                                  <p className="mb-2">
                                    <strong>💉 Therapeutic Class:</strong> {medicine.therapeutic_class}
                                  </p>
                                )}
                                {medicine.substitutes?.length > 0 && (
                                  <p className="mb-0">
                                    <strong>🔄 Substitutes:</strong> {medicine.substitutes.slice(0, 5).join(', ')}
                                    {medicine.substitutes.length > 5 && ` (+${medicine.substitutes.length - 5} more)`}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                ))}
            </div>
          )}

          {/* Raw Extracted Text Section */}
          {result.extractedText && (
            <div className="mt-4 p-3 bg-white rounded">
              <details>
                <summary className="text-muted" style={ { cursor: 'pointer' } }>
                  <small>View raw text extracted from prescription</small>
                </summary>
                <pre className="mt-2 p-2 bg-light border rounded" style={ { fontSize: '0.8rem', maxHeight: '200px', overflow: 'auto' } }>
                  {result.extractedText}
                </pre>
              </details>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default PrescriptionPage;
