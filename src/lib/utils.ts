import { APIResponse } from '@/types';
import crypto from 'crypto';

// API Response Helpers
export function successResponse<T>(data: T, message: string = 'Success'): APIResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

export function errorResponse(error: string, code: number = 400): APIResponse {
  return {
    success: false,
    error,
    code,
  };
}

// Webhook Signature Verification
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  return signature === expectedSignature;
}

export function verify11zaSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  return signature === expectedSignature;
}

// Generate unique IDs
export function generateOrderId(): string {
  return `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateCartId(): string {
  return `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generatePaymentId(): string {
  return `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Phone Number Validation
export function validatePhoneNumber(phone: string): boolean {
  // Indian phone number format: 10 digits or +91 + 10 digits
  const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

// Format phone to standard format
export function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return cleaned;
  }
  
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  
  throw new Error('Invalid phone number format');
}

// Structured Logging
export function logStructured(level: string, message: string, data?: any): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(data && { data }),
  };

  if (level === 'error') {
    console.error(JSON.stringify(logEntry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

// Retry Logic
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        logStructured('warn', `Retry attempt ${i + 1}/${maxRetries} after ${delay}ms`, {
          error: lastError.message,
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

// Rate Limiting Helper (for demonstration)
const requestCounts = new Map<string, number[]>();

export function isRateLimited(key: string, limit: number = 50, windowMs: number = 60000): boolean {
  const now = Date.now();
  const timestamps = requestCounts.get(key) || [];

  // Remove old timestamps outside the window
  const recentRequests = timestamps.filter(ts => now - ts < windowMs);

  if (recentRequests.length >= limit) {
    return true;
  }

  recentRequests.push(now);
  requestCounts.set(key, recentRequests);

  return false;
}

// Pagination Helper
export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export function getPaginationParams(query: any): PaginationParams {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}
