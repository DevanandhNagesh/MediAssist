import Joi from 'joi';

export const knowledgeSearchSchema = Joi.object({
  query: Joi.string().trim().min(2).required()
});
