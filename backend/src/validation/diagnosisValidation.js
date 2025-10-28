import Joi from 'joi';

export const symptomAnalysisSchema = Joi.object({
  symptoms: Joi.array().items(Joi.string().trim().min(2)).min(1).required(),
  age: Joi.number().integer().min(0).max(120).optional(),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
  duration: Joi.number().integer().min(0).max(365).optional()
});
