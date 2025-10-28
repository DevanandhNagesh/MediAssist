import { Spinner } from 'react-bootstrap';

const LoadingSpinner = ({ message = 'Loading...' }) => (
  <div className="d-flex flex-column align-items-center justify-content-center py-5">
    <Spinner animation="border" role="status" />
    <p className="mt-3 text-muted">{message}</p>
  </div>
);

export default LoadingSpinner;
