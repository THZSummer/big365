import client from './client';
import type { ApiResponse, DemoJobInfo, CreateDemoJobRequest } from './types';

export async function createDemoJob(
  biz: string,
  data: CreateDemoJobRequest,
): Promise<ApiResponse<{ jobId: string }>> {
  return client.post(`/${biz}/demo-data/jobs`, data);
}

export async function getDemoJob(
  biz: string,
  jobId: string,
): Promise<ApiResponse<DemoJobInfo>> {
  return client.get(`/${biz}/demo-data/jobs/${jobId}`);
}
