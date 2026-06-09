import client from './client';
import type { ApiResponse, PageResponse, DimensionInfo, CreateDimensionRequest, UpdateDimensionRequest } from './types';

export async function listDimensions(
  biz: string,
  pageNo = 1,
  pageSize = 50,
): Promise<ApiResponse<PageResponse<DimensionInfo>>> {
  return client.get(`/${biz}/dimensions`, { params: { pageNo, pageSize } });
}

export async function createDimension(
  biz: string,
  data: CreateDimensionRequest,
): Promise<ApiResponse<DimensionInfo>> {
  return client.post(`/${biz}/dimensions`, data);
}

export async function getDimension(
  biz: string,
  id: number,
): Promise<ApiResponse<DimensionInfo>> {
  return client.get(`/${biz}/dimensions/${id}`);
}

export async function updateDimension(
  biz: string,
  id: number,
  data: UpdateDimensionRequest,
): Promise<ApiResponse<DimensionInfo>> {
  return client.put(`/${biz}/dimensions/${id}`, data);
}

export async function disableDimension(
  biz: string,
  id: number,
): Promise<ApiResponse<void>> {
  return client.delete(`/${biz}/dimensions/${id}`);
}
