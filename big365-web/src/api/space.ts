import client from './client';
import type {
  ApiResponse,
  SpaceWriteRequest,
  SpaceWriteResponse,
  SpaceQueryResponse,
  SpaceListResponse,
  DeleteSpaceRequest,
  DeleteSpaceResponse,
  SpaceQueryParams,
} from './types';

export async function writeSpace(
  biz: string,
  data: SpaceWriteRequest,
): Promise<ApiResponse<SpaceWriteResponse>> {
  return client.post(`/${biz}/space/write`, data);
}

export async function querySpace(
  biz: string,
  params: SpaceQueryParams,
): Promise<ApiResponse<SpaceQueryResponse>> {
  return client.get(`/${biz}/space/query`, { params });
}

/**
 * V2: Time range query using dateFrom/dateTo
 */
export async function querySpaceRange(
  biz: string,
  coordinates: Record<string, number>,
  dateFrom: string,
  dateTo: string,
): Promise<ApiResponse<SpaceQueryResponse>> {
  return client.get(`/${biz}/space/query`, {
    params: { ...coordinates, dateFrom, dateTo },
  });
}

/**
 * V2: List space cells with pagination and optional dimension filters
 */
export async function listSpace(
  biz: string,
  pageNo: number = 1,
  pageSize: number = 20,
  dimensions?: string,
): Promise<ApiResponse<SpaceListResponse>> {
  const params: Record<string, any> = { pageNo, pageSize };
  if (dimensions) {
    params.dimensions = dimensions;
  }
  return client.get(`/${biz}/space/list`, { params });
}

/**
 * V2: Delete space cell(s)
 */
export async function deleteSpaceCell(
  biz: string,
  coordinates: Record<string, number>,
  date?: string,
): Promise<ApiResponse<DeleteSpaceResponse>> {
  return client.delete(`/${biz}/space/delete`, {
    data: { coordinates, date },
  });
}
