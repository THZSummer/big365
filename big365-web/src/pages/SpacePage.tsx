import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { listDimensions } from '../api/dimensions';
import { querySpace, writeSpace } from '../api/space';
import type { DimensionInfo, SpaceWriteRequest, SpaceQueryResponse } from '../api/types';
import ErrorBanner from '../components/ErrorBanner';
import Loading from '../components/Loading';
import BizSelector from '../components/BizSelector';
import CoordinateInput from '../components/CoordinateInput';

function SpacePage() {
  const { biz } = useParams<{ biz: string }>();
  const bizName = biz || '';

  const [dimensions, setDimensions] = useState<DimensionInfo[]>([]);
  const [dimLoading, setDimLoading] = useState(true);
  const [dimError, setDimError] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Query section
  const [queryCoords, setQueryCoords] = useState<Record<string, number>>({});
  const [queryDate, setQueryDate] = useState('');
  const [queryResult, setQueryResult] = useState<SpaceQueryResponse | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  // Write section
  const [writeCoords, setWriteCoords] = useState<Record<string, number>>({});
  const [writeDate, setWriteDate] = useState('');
  const [writeValue, setWriteValue] = useState<number>(0);
  const [writeResult, setWriteResult] = useState<number | null>(null);
  const [writeLoading, setWriteLoading] = useState(false);
  const [writeError, setWriteError] = useState<string | null>(null);

  // Drill-down section
  const [drillCoords, setDrillCoords] = useState<Record<string, number>>({});
  const [drillResults, setDrillResults] = useState<{ coords: Record<string, number>; value: number }[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);

  const fetchDimensions = useCallback(() => {
    if (!bizName) return;
    setDimLoading(true);
    setDimError(null);
    listDimensions(bizName)
      .then((res) => {
        const dims = res.data?.items || [];
        setDimensions(dims);
        // Initialize coordinate values to 0 (ALL)
        const initCoords: Record<string, number> = {};
        dims.forEach((d) => { initCoords[d.columnName] = 0; });
        setQueryCoords(initCoords);
        setWriteCoords(
          Object.fromEntries(dims.map((d) => [d.columnName, 1]))
        );
        setDrillCoords(initCoords);
      })
      .catch((err) => setDimError(err.message))
      .finally(() => setDimLoading(false));
  }, [bizName]);

  useEffect(() => {
    fetchDimensions();
  }, [fetchDimensions]);

  // Handle query
  const handleQuery = () => {
    setQueryLoading(true);
    setQueryError(null);
    setQueryResult(null);
    const params: Record<string, any> = { ...queryCoords, date: queryDate };
    querySpace(bizName, params)
      .then((res) => {
        setQueryResult(res.data);
      })
      .catch((err) => {
        setQueryError(err.message);
        showToast('查询失败: ' + err.message, 'error');
      })
      .finally(() => setQueryLoading(false));
  };

  // Handle write
  const handleWrite = () => {
    setWriteLoading(true);
    setWriteError(null);
    setWriteResult(null);
    const data: SpaceWriteRequest = {
      coordinates: writeCoords,
      date: writeDate,
      value: writeValue,
    };
    writeSpace(bizName, data)
      .then((res) => {
        const affected = res.data?.rows_affected || 0;
        setWriteResult(affected);
        showToast(`写入成功，影响 ${affected} 行`, 'success');
      })
      .catch((err) => {
        setWriteError(err.message);
        showToast('写入失败: ' + err.message, 'error');
      })
      .finally(() => setWriteLoading(false));
  };

  // Handle drill-down
  const handleDrillDown = async () => {
    setDrillLoading(true);
    const results: { coords: Record<string, number>; value: number }[] = [];

    // Start with Grand Total (all 0)
    const gtParams: Record<string, any> = { ...drillCoords, date: queryDate || writeDate || '20260101' };
    try {
      const gtRes = await querySpace(bizName, gtParams);
      results.push({ coords: { ...drillCoords }, value: gtRes.data?.value ?? 0 });

      // Drill each dimension one by one
      for (const dim of dimensions) {
        const newCoords = { ...results[results.length - 1].coords };
        // Change this dimension from 0 to a specific leaf value
        newCoords[dim.columnName] = 1;
        const params: Record<string, any> = { ...newCoords, date: gtParams.date };
        const res = await querySpace(bizName, params);
        results.push({ coords: { ...newCoords }, value: res.data?.value ?? 0 });
      }
      setDrillResults(results);
    } catch (err: any) {
      showToast('下钻查询失败: ' + (err.message || '未知错误'), 'error');
    } finally {
      setDrillLoading(false);
    }
  };

  const sectionStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #eee',
    marginBottom: '20px',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 700,
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  if (dimLoading) return <Loading />;
  if (dimError) return <ErrorBanner message={dimError} onRetry={fetchDimensions} />;

  if (dimensions.length === 0) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <h2>数据空间</h2>
          <BizSelector currentBiz={bizName} />
        </div>
        <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>
          <p style={{ fontSize: '18px', marginBottom: '12px' }}>该业务暂无维度定义</p>
          <p>请先在维度管理中添加维度，或切换到其他业务</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2>数据空间</h2>
          <BizSelector currentBiz={bizName} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Left column: Query + Write */}
        <div>
          {/* Query Section */}
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>🔍 坐标查询</h3>
            <CoordinateInput
              dimensions={dimensions}
              values={queryCoords}
              onChange={setQueryCoords}
              allowZero={true}
            />
            <div style={{ marginTop: '16px', display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '13px' }}>
                  日期
                </label>
                <input
                  type="text"
                  value={queryDate}
                  onChange={(e) => setQueryDate(e.target.value)}
                  placeholder="例: 20260101"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
                />
              </div>
              <button
                onClick={handleQuery}
                disabled={queryLoading || !queryDate}
                style={{
                  background: '#1a73e8', color: '#fff', border: 'none',
                  padding: '10px 24px', borderRadius: '8px', fontWeight: 600,
                  opacity: (queryLoading || !queryDate) ? 0.6 : 1,
                }}
              >
                {queryLoading ? '查询中...' : '查询'}
              </button>
            </div>

            {queryError && <ErrorBanner message={queryError} />}

            {queryResult && (
              <div style={{
                marginTop: '16px', background: '#f5f7fa', borderRadius: '8px',
                padding: '16px', display: 'flex', gap: '24px',
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>坐标</div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>
                    {Object.entries(queryResult.coordinates || queryCoords)
                      .map(([k, v]) => `${k}=${v}`)
                      .join(', ')}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>日期</div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{queryResult.date}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>指标值</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#1a73e8' }}>{queryResult.value}</div>
                </div>
              </div>
            )}
          </div>

          {/* Write Section */}
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>✏️ 写入数据</h3>
            <p style={{ fontSize: '12px', color: '#999', marginBottom: '12px' }}>
              选择具体叶子值（不允许 ALL），输入日期和指标值
            </p>
            <CoordinateInput
              dimensions={dimensions}
              values={writeCoords}
              onChange={setWriteCoords}
              allowZero={false}
            />
            <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: '120px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '13px' }}>
                  日期
                </label>
                <input
                  type="text"
                  value={writeDate}
                  onChange={(e) => setWriteDate(e.target.value)}
                  placeholder="20260101"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
                />
              </div>
              <div style={{ flex: 1, minWidth: '120px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '13px' }}>
                  指标值
                </label>
                <input
                  type="number"
                  value={writeValue}
                  onChange={(e) => setWriteValue(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
                />
              </div>
              <button
                onClick={handleWrite}
                disabled={writeLoading || !writeDate}
                style={{
                  background: '#1a73e8', color: '#fff', border: 'none',
                  padding: '10px 24px', borderRadius: '8px', fontWeight: 600,
                  opacity: (writeLoading || !writeDate) ? 0.6 : 1,
                }}
              >
                {writeLoading ? '写入中...' : '提交'}
              </button>
            </div>

            {writeError && <ErrorBanner message={writeError} />}

            {writeResult !== null && (
              <div style={{
                marginTop: '16px', background: '#e8f5e9', borderRadius: '8px',
                padding: '16px', color: '#2e7d32', fontWeight: 600,
              }}>
                ✅ 写入成功，影响 <strong>{writeResult}</strong> 行 (2^{dimensions.length} = {Math.pow(2, dimensions.length)})
              </div>
            )}
          </div>
        </div>

        {/* Right column: Drill-down */}
        <div>
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>📊 下钻演示</h3>
            <p style={{ fontSize: '12px', color: '#999', marginBottom: '12px' }}>
              从 Grand Total（所有维度=0）开始，逐维度改为具体值，观察聚合级别变化
            </p>

            <CoordinateInput
              dimensions={dimensions}
              values={drillCoords}
              onChange={setDrillCoords}
              allowZero={true}
            />

            <div style={{ marginTop: '16px', display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '13px' }}>
                  日期
                </label>
                <input
                  type="text"
                  value={queryDate || writeDate}
                  onChange={() => {}}
                  placeholder="先在上方设置日期"
                  readOnly
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: '6px',
                    border: '1px solid #ddd', background: '#f9f9f9',
                  }}
                />
              </div>
              <button
                onClick={handleDrillDown}
                disabled={drillLoading || (!queryDate && !writeDate)}
                style={{
                  background: '#1a73e8', color: '#fff', border: 'none',
                  padding: '10px 24px', borderRadius: '8px', fontWeight: 600,
                  opacity: (drillLoading || (!queryDate && !writeDate)) ? 0.6 : 1,
                }}
              >
                {drillLoading ? '查询中...' : '执行下钻'}
              </button>
            </div>

            {drillResults.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                {drillResults.map((result, idx) => {
                  const label = idx === 0
                    ? 'Grand Total (全部 ALL)'
                    : `下钻: ${dimensions[idx - 1]?.displayName || `维度${idx}`}=1`;
                  const prevValue = idx > 0 ? drillResults[idx - 1].value : null;
                  const diff = prevValue !== null ? result.value - prevValue : null;

                  return (
                    <div
                      key={idx}
                      style={{
                        background: idx === 0 ? '#f5f7fa' : '#fff',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        marginBottom: '8px',
                        border: '1px solid #eee',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>
                          {label}
                        </div>
                        <div style={{ fontSize: '11px', color: '#999' }}>
                          {Object.entries(result.coords)
                            .map(([k, v]) => `${k}=${v}`)
                            .join(', ')}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#1a73e8' }}>
                          {result.value.toLocaleString()}
                        </div>
                        {diff !== null && (
                          <div style={{
                            fontSize: '12px',
                            color: diff < 0 ? '#c62828' : diff > 0 ? '#2e7d32' : '#999',
                          }}>
                            {diff >= 0 ? '+' : ''}{diff.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: toast.type === 'success' ? '#e8f5e9' : '#ffebee',
            color: toast.type === 'success' ? '#2e7d32' : '#c62828',
            padding: '12px 24px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '14px',
            zIndex: 2000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {toast.type === 'success' ? '✅ ' : '❌ '}
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default SpacePage;
