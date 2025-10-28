import { Row, Col, Card } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/home.scss';

const modules = [
  {
    title: 'Medicine Tracker',
    description: 'Track your medicines, dosage schedules, adherence scores, and stock levels with AI-powered reminders.',
    path: '/medicine-logs',
    requiresAuth: true
  },
  {
    title: 'Smart Diagnosis Advisor',
    description: 'Input your symptoms to receive AI-backed suggestions of probable conditions and guidance on when to seek care.',
    path: '/diagnosis',
    requiresAuth: true
  },
  {
    title: 'Prescription Insight Module',
    description: 'Upload handwritten prescriptions to decode medicines, dosage, and safety information instantly.',
    path: '/prescription',
    requiresAuth: true
  },
  {
    title: 'Medical Knowledge Simplifier',
    description: 'Search complex medical terms and receive clear, simplified explanations tailored for everyday understanding.',
    path: '/knowledge',
    requiresAuth: true
  }
];

const HomePage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleModuleClick = (module, e) => {
    if (module.requiresAuth && !isAuthenticated) {
      e.preventDefault();
      navigate('/login', { state: { from: module.path } });
    }
  };

  return (
    <section className="home-page">
      <div className="hero-section mb-5 text-center">
        <h1 className="display-4 fw-bold text-white mb-3">Welcome to MediAssist AI</h1>
        <p className="lead text-light mb-4">
          Your all-in-one digital healthcare companion for quicker insights, better understanding, and smarter decisions.
        </p>
        {!isAuthenticated && (
          <div className="cta-buttons">
            <Link to="/register" className="btn btn-primary btn-lg me-3">Get Started</Link>
            <Link to="/login" className="btn btn-outline-light btn-lg">Login</Link>
          </div>
        )}
      </div>
      <Row xs={1} md={2} lg={2} className="g-4">
        {modules.map(module => (
          <Col key={module.title}>
            <Card className="module-card h-100">
              <Card.Body>
                <Card.Title>{module.title}</Card.Title>
                <Card.Text>{module.description}</Card.Text>
              </Card.Body>
              <Card.Footer className="bg-white border-0">
                <Link 
                  to={module.path} 
                  className="btn btn-primary w-100"
                  onClick={(e) => handleModuleClick(module, e)}
                >
                  Launch Module
                  {module.requiresAuth && !isAuthenticated && (
                    <span className="ms-2 badge bg-warning text-dark">Login Required</span>
                  )}
                </Link>
              </Card.Footer>
            </Card>
          </Col>
        ))}
      </Row>
    </section>
  );
};

export default HomePage;
