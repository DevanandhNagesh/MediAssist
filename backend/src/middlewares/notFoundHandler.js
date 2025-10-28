const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    requestId: req.requestId,
    message: 'Resource not found'
  });
};

export default notFoundHandler;
