import { useEffect, useState } from 'react';
import { Row, Col, Alert, Badge, ListGroup } from 'react-bootstrap';
import SymptomForm from '../components/forms/SymptomForm.jsx';
import ConfidenceChart from '../components/shared/ConfidenceChart.jsx';
import LoadingSpinner from '../components/shared/LoadingSpinner.jsx';
import ErrorAlert from '../components/shared/ErrorAlert.jsx';
import useApi from '../hooks/useApi.js';
import '../styles/diagnosis.scss';

const DiagnosisPage = () => {
  const api = useApi();
  const [metadata, setMetadata] = useState({ symptoms: [] });
  const [loadingMetadata, setLoadingMetadata] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMetadata = async() => {
      try {
        const { data } = await api.get('/diagnosis/metadata');
        setMetadata(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoadingMetadata(false);
      }
    };

    fetchMetadata();
  }, [api]);

  const handleAnalyze = async(payload) => {
    try {
      setError(null);
      setLoadingAnalysis(true);
      const { data } = await api.post('/diagnosis', payload);
      setAnalysis(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  if (loadingMetadata) {
    return <LoadingSpinner message="Loading symptom data..." />;
  }

  return (
    <section className="diagnosis-page">
      <header className="page-header mb-4">
        <h1>Smart Diagnosis Advisor</h1>
        <p>Enter symptoms to receive probable conditions and suggested next steps.</p>
      </header>

      {error && <ErrorAlert message={error.message} />}

      <div className="symptom-form-card">
        <SymptomForm onSubmit={handleAnalyze} loading={loadingAnalysis} availableSymptoms={metadata.symptoms} />
      </div>

      {analysis && (
        <div className="results-card">
          <Row className="g-4">
            <Col lg={6}>
              <h3>Predicted Conditions</h3>
            {analysis.predictions?.length ? (
              <ConfidenceChart data={analysis.predictions} />
            ) : (
              <Alert variant="info">No strong matches found. Consider consulting a physician.</Alert>
            )}
            {analysis.visualization && (
              <div className="mt-3">
                <h6>Probable Conditions</h6>
                {analysis.visualization.probable?.length ? (
                  <div className="d-flex flex-wrap gap-2">
                    {analysis.visualization.probable.map(item => (
                      <Badge bg="primary" key={`probable-${item.disease}`}>
                        {item.disease} ({Math.round(item.confidence * 100)}%)
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted">No high confidence matches.</p>
                )}

                <h6 className="mt-3">Possible Conditions</h6>
                {analysis.visualization.possible?.length ? (
                  <div className="d-flex flex-wrap gap-2">
                    {analysis.visualization.possible.map(item => (
                      <Badge bg="secondary" key={`possible-${item.disease}`}>
                        {item.disease} ({Math.round(item.confidence * 100)}%)
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted">No medium confidence matches.</p>
                )}
              </div>
            )}
            </Col>
            <Col lg={6}>
              <h3>Recommended Actions</h3>
            {analysis.recommendedActions?.length ? (
              <ListGroup>
                {analysis.recommendedActions.map(action => (
                  <ListGroup.Item key={action}>{action}</ListGroup.Item>
                ))}
              </ListGroup>
            ) : (
              <p className="text-muted">No immediate actions recommended.</p>
            )}
          </Col>
        </Row>
        </div>
      )}
    </section>
  );
};

export default DiagnosisPage;
