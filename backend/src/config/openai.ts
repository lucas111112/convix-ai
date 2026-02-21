import OpenAI from 'openai';
import { env } from './env';

export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
});
