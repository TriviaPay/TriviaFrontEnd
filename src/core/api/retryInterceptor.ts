import { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../services/Logger';

export interface RetryConfig {
    retries: number;
    retryDelay: (retryCount: number) => number;
    retryCondition: (error: AxiosError) => boolean;
}

export const defaultRetryConfig: RetryConfig = {
    retries: 3,
    retryDelay: (retryCount: number) => {
        return Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
    },
    retryCondition: (error: AxiosError) => {
        // Only retry on network errors or 5xx server errors
        // Don't retry on 4xx client errors (except maybe 408 timeout)
        return (
            !error.response ||
            (error.response.status >= 500 && error.response.status <= 599) ||
            error.response.status === 408
        );
    },
};

/**
 * Attaches a retry interceptor to an Axios instance
 */
export const attachRetryInterceptor = (
    axiosInstance: AxiosInstance,
    config: Partial<RetryConfig> = {}
) => {
    const finalConfig = { ...defaultRetryConfig, ...config };

    axiosInstance.interceptors.response.use(undefined, async (error: AxiosError) => {
        const { config: axiosConfig } = error;

        if (!axiosConfig) {
            return Promise.reject(error);
        }

        // Initialize retry state if not present
        const currentState = (axiosConfig as any).__retryCount || 0;

        // Check if we should retry
        if (currentState < finalConfig.retries && finalConfig.retryCondition(error)) {
            const nextRetryCount = currentState + 1;
            (axiosConfig as any).__retryCount = nextRetryCount;

            const delay = finalConfig.retryDelay(currentState);
            logger.warn(`Retrying request (attempt ${nextRetryCount}) in ${delay}ms: ${axiosConfig.url}`, 'API');

            await new Promise(resolve => setTimeout(resolve, delay));
            return axiosInstance(axiosConfig);
        }

        return Promise.reject(error);
    });
};
