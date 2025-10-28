import { useState } from 'react';
import { Alert, Card, ListGroup, Badge } from 'react-bootstrap';
import KnowledgeSearchForm from '../components/forms/KnowledgeSearchForm.jsx';
import ErrorAlert from '../components/shared/ErrorAlert.jsx';
import useApi from '../hooks/useApi.js';
import '../styles/knowledge.scss';

const KnowledgePage = () => {
  const api = useApi();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async(query) => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.post('/knowledge/search', { query });
      setResult(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="knowledge-page">
      <header className="page-header mb-4">
        <h1>Medical Knowledge Simplifier</h1>
        <p>Translate complex medical language into clear, actionable insights.</p>
      </header>

      {error && <ErrorAlert message={error.message} />}

      <div className="search-card">
        <KnowledgeSearchForm onSearch={handleSearch} loading={loading} />
      </div>

      {result && (
        <div className="results-card mt-4">
          {!result.isMedical && (
            <Alert variant="warning">
              {result.definition || 'Not a medical term—can’t explain.'}
            </Alert>
          )}

          <Card className="shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div>
                  <Card.Title className="mb-0 text-capitalize">{result.term || result.query}</Card.Title>
                  <small className="text-muted">Results powered by Gemini</small>
                </div>
                <Badge bg={result.isMedical ? 'success' : 'secondary'}>
                  {result.isMedical ? 'Medical term' : 'Unknown term'}
                </Badge>
              </div>

              {result.definition && (
                <p className="mb-3">{result.definition}</p>
              )}

              {result.summary && (
                <Alert variant="info" className="mb-3">
                  {result.summary}
                </Alert>
              )}

              {Array.isArray(result.references) && result.references.length > 0 && (
                <div>
                  <h6>References</h6>
                  <ListGroup variant="flush">
                    {result.references.map((reference, index) => (
                      <ListGroup.Item key={index}>{reference}</ListGroup.Item>
                    ))}
                  </ListGroup>
                </div>
              )}
            </Card.Body>
          </Card>
        </div>
      )}
    </section>
  );
};

export default KnowledgePage;
