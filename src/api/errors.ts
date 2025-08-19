export class RFMError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'RFMError';
  }
}

export class ValidationError extends RFMError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class APIError extends RFMError {
  constructor(
    message: string,
    public statusCode?: number,
    details?: Record<string, any>
  ) {
    super(message, 'API_ERROR', details);
    this.name = 'APIError';
  }
}

export class DataError extends RFMError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'DATA_ERROR', details);
    this.name = 'DataError';
  }
}
