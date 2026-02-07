
import { AxiosRequestConfig } from 'axios';
import { logger } from './Logger';

// List of sensitive fields that should never be sent from client to server
// These should be calculated/validated on the server side only
const SENSITIVE_FIELDS = [
    'score',
    'correctness',
    'rewardEligibility',
    'isCorrect',
    'points',
    'coins',
    'gems'
];

/**
 * recursively sanitizes an object to remove sensitive fields
 */
const sanitizePayload = (data: any): any => {
    if (!data) return data;

    if (Array.isArray(data)) {
        return data.map(item => sanitizePayload(item));
    }

    if (typeof data === 'object' && data !== null) {
        const sanitized: any = { ...data };

        // Check for sensitive fields at this level
        SENSITIVE_FIELDS.forEach(field => {
            if (field in sanitized) {
                logger.warn(`Security check: Stripping sensitive field '${field}' from outgoing payload`, 'SECURITY');
                delete sanitized[field];
            }
        });

        // Recursively check nested objects
        Object.keys(sanitized).forEach(key => {
            if (typeof sanitized[key] === 'object') {
                sanitized[key] = sanitizePayload(sanitized[key]);
            }
        });

        return sanitized;
    }

    return data;
};

/**
 * Interceptor to prevent client-side manipulation of sensitive data
 */
export const securityInterceptor = (config: AxiosRequestConfig): AxiosRequestConfig => {
    if (config.data) {
        try {
            // Parse if string (axios sometimes serializes early)
            let data = config.data;
            const isString = typeof data === 'string';

            if (isString) {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    // Not JSON, skip sanitization
                    return config;
                }
            }

            const sanitizedData = sanitizePayload(data);

            config.data = isString ? JSON.stringify(sanitizedData) : sanitizedData;

        } catch (error) {
            logger.error('Error in security interceptor', 'SECURITY', error);
            // In case of error, better to fail open in dev but log loudly, 
            // or fail closed? For now, we log and proceed to avoid breaking app 
            // if sanitization fails for benign reasons.
        }
    }
    return config;
};
