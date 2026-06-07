import client from './client';
import type { ApiResponse, PageResponse, BizInfo, BizRegisterRequest, BizRegisterResponse } from './types';

/**
 * Register a new business
 */
export async function registerBiz(request: BizRegisterRequest): Promise<ApiResponse<BizRegisterResponse>> {
  return client.post('/biz/register', request);
}

/**
 * List all registered businesses
 */
export async function listBiz(): Promise<ApiResponse<PageResponse<BizInfo>>> {
  return client.get('/biz/list');
}
