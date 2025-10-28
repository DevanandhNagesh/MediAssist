import { Link } from 'react-router-dom';
import { Button } from 'react-bootstrap';

const NotFoundPage = () => (
  <section className="text-center py-5">
    <h1 className="display-4">404</h1>
    <p className="lead text-muted">The page you’re looking for doesn’t exist.</p>
    <Button as={Link} to="/" variant="primary">Return Home</Button>
  </section>
);

export default NotFoundPage;
