// Health check types
export interface HealthStatus {
  status: string;
  database?: string;
  uptime?: string;
}

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
  bizName: string;
  bizLabel: string;
  dimensions: DimensionDef[];
  dateRange: DateRange;
}

export interface BizRegisterResponse {
  bizName: string;
  tablesCreated: string[];
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

/** Query params for space query (single date or range) */
export interface SpaceQueryParams {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  [key: string]: number | string | undefined;
}

export interface SpaceWriteRequest {
  coordinates: Record<string, number>;
  date: string;
  value: number;
}

export interface SpaceWriteResponse {
  rowsAffected: number;
}

export interface SpaceQueryResponse {
  coordinates: Record<string, number>;
  date: string;
  value: number;
  // V2: Time range query metadata (null/undefined for single-day queries)
  dateFrom?: string;
  dateTo?: string;
  scannedDates?: number;
  aggregationMethod?: string;
  warning?: string;
}

// V2: Space list types
export interface SpaceListResponse {
  list: SpaceCell[];
  total: number;
  pageNo: number;
  pageSize: number;
  totalPages: number;
}

export interface DeleteSpaceRequest {
  coordinates: Record<string, number>;
  date?: string;
}

export interface DeleteSpaceResponse {
  deletedRows: number;
  coordinates: Record<string, number>;
  date?: string;
}

// V2: HomePage demo summary
export interface DemoSummaryData {
  dateFrom: string;
  dateTo: string;
  scannedDates: number;
  appResults: {
    app: number;
    value: number;
  }[];
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
  dateRange: DateRange;
}
