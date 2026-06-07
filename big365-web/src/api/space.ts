import client from './client';
import type { ApiResponse, SpaceWriteRequest, SpaceWriteResponse, SpaceQueryResponse } from './types';

export async function writeSpace(biz: string, data: SpaceWriteRequest) {
  return client.post<any, ApiResponse<SpaceWriteResponse>>(`/${biz}/space/write`, data);
}

export async function querySpace(biz: string, params: Record<string, any>) {
  return client.get<any, ApiResponse<SpaceQueryResponse>>(`/${biz}/space/query`, { params });
}
