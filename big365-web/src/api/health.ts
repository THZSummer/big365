import client from './client';
import type { ApiResponse, HealthStatus } from './types';

/**
 * Check backend health status.
 */
export async function checkHealth(): Promise<ApiResponse<HealthStatus>> {
  return client.get('/health');
}
