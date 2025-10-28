import { validationResult } from 'express-validator';

// This middleware works with both express-validator and Joi schemas
const validateRequest = (schema) => {
  // If no schema is provided, use express-validator
  if (!schema) {
    return (req, res, next) => {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array().map(err => ({
            field: err.path || err.param,
            message: err.msg
          }))
        });
      }
      
      next();
    };
  }

  // If schema is provided, use Joi validation
  return (req, res, next) => {
    const data = {
      ...req.body,
      ...req.query,
      ...req.params
    };

    const { error, value } = schema.validate(data, { abortEarly: false, allowUnknown: true });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    req.validatedData = value;
    return next();
  };
};

export default validateRequest;
