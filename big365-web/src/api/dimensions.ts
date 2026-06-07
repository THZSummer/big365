import client from './client';
import type { ApiResponse, PageResponse, DimensionInfo, CreateDimensionRequest, UpdateDimensionRequest } from './types';

export async function listDimensions(biz: string, pageNo = 1, pageSize = 50) {
  return client.get<any, ApiResponse<PageResponse<DimensionInfo>>>(`/${biz}/dimensions`, { params: { pageNo, pageSize } });
}

export async function createDimension(biz: string, data: CreateDimensionRequest) {
  return client.post<any, ApiResponse<DimensionInfo>>(`/${biz}/dimensions`, data);
}

export async function getDimension(biz: string, id: number) {
  return client.get<any, ApiResponse<DimensionInfo>>(`/${biz}/dimensions/${id}`);
}

export async function updateDimension(biz: string, id: number, data: UpdateDimensionRequest) {
  return client.put<any, ApiResponse<DimensionInfo>>(`/${biz}/dimensions/${id}`, data);
}

export async function disableDimension(biz: string, id: number) {
  return client.delete<any, ApiResponse<void>>(`/${biz}/dimensions/${id}`);
}
