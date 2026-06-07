// API Response types

export interface ApiResponse<T> {
  success: boolean;
  code: string;
  message: string;
  data: T;
  error: string | null;
}

export interface PageResponse<T> {
  items: T[];
  pageNo: number;
  pageSize: number;
  total: number;
}

// Biz types
export interface BizInfo {
  bizName: string;
  bizLabel: string;
  dimensionCount: number;
  status: string;
  createdAt: string;
}

export interface DimensionDef {
  columnName: string;
  displayName: string;
  leafMin: number;
  leafMax: number;
}

export interface DateRange {
  from: string;
  to: string;
}

export interface BizRegisterRequest {
  biz_name: string;
  biz_label: string;
  dimensions: DimensionDef[];
  date_range: DateRange;
}

export interface BizRegisterResponse {
  biz_name: string;
  tables_created: string[];
}

// Dimension types
export interface DimensionInfo {
  id: number;
  bizName: string;
  columnName: string;
  displayName: string;
  description: string;
  leafMin: number;
  leafMax: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDimensionRequest {
  columnName: string;
  displayName: string;
  description?: string;
  leafMin: number;
  leafMax: number;
}

export interface UpdateDimensionRequest {
  displayName?: string;
  description?: string;
  enabled?: boolean;
}

// Space types
export interface SpaceCell {
  coordinates: Record<string, number>;
  date: string;
  value: number;
}

export interface SpaceWriteRequest {
  coordinates: Record<string, number>;
  date: string;
  value: number;
}

export interface SpaceWriteResponse {
  rows_affected: number;
}

export interface SpaceQueryResponse {
  coordinates: Record<string, number>;
  date: string;
  value: number;
}

// Demo types
export interface DemoJobInfo {
  jobId: string;
  bizName: string;
  scale: string;
  status: string;
  progress: number;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDemoJobRequest {
  scale: 'small' | 'medium' | 'large';
  date_range: DateRange;
}
