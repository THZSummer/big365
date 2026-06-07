import client from './client';
import type { ApiResponse, DemoJobInfo, CreateDemoJobRequest } from './types';

export async function createDemoJob(biz: string, data: CreateDemoJobRequest) {
  return client.post<any, ApiResponse<{ jobId: string }>>(`/${biz}/demo-data/jobs`, data);
}

export async function getDemoJob(biz: string, jobId: string) {
  return client.get<any, ApiResponse<DemoJobInfo>>(`/${biz}/demo-data/jobs/${jobId}`);
}
