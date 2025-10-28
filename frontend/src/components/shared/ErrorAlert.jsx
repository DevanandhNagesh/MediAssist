import { Alert } from 'react-bootstrap';

const ErrorAlert = ({ title = 'Something went wrong', message }) => (
  <Alert variant="danger">
    <Alert.Heading>{title}</Alert.Heading>
    <p>{message}</p>
  </Alert>
);

export default ErrorAlert;
