import 'dotenv/config';
console.log('MONGODB_URI:', process.env.MONGODB_URI ?? '<undefined>');
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ?? '<undefined>');
