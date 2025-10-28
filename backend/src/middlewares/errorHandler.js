import logger from '../config/logger.js';

const errorHandler = (err, req, res, next) => {
  logger.error('API error', {
    requestId: req.requestId,
    path: req.path,
    message: err.message,
    stack: err.stack
  });

  const status = err.status || 500;
  const response = {
    requestId: req.requestId,
    message: err.message || 'Internal Server Error'
  };

  if (err.details) {
    response.details = err.details;
  }

  res.status(status).json(response);
};

export default errorHandler;
