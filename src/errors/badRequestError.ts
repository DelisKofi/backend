import { AppError } from './AppError.js';

export class BadRequestError extends AppError {
  constructor(message: string = 'Invalid request parameters') {
    super(message, 400);
  }
}
