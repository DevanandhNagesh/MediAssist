import { Card } from 'react-bootstrap';

const InfoCard = ({ title, subtitle, body, footer, variant = 'light' }) => (
  <Card bg={variant} text={variant === 'light' ? 'dark' : 'white'} className="mb-3 shadow-sm">
    <Card.Body>
      {title && <Card.Title>{title}</Card.Title>}
      {subtitle && <Card.Subtitle className="mb-2 text-muted">{subtitle}</Card.Subtitle>}
      {body && <Card.Text>{body}</Card.Text>}
      {footer && <div className="mt-3">{footer}</div>}
    </Card.Body>
  </Card>
);

export default InfoCard;
