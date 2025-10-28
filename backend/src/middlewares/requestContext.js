import { v4 as uuid } from 'uuid';

const requestContext = () => (req, res, next) => {
  req.requestId = uuid();
  res.setHeader('X-Request-Id', req.requestId);
  next();
};

export default requestContext;
