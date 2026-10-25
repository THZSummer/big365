import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { listDimensions } from '../api/dimensions';
import { querySpace, querySpaceRange, writeSpace, listSpace, deleteSpaceCell } from '../api/space';
import type { DimensionInfo, SpaceWriteRequest, SpaceQueryResponse, SpaceCell, SpaceQueryParams } from '../api/types';
import ErrorBanner from '../components/ErrorBanner';
import Loading from '../components/Loading';
import BizSelector from '../components/BizSelector';
import CoordinateInput from '../components/CoordinateInput';
import DateRangePicker from '../components/DateRangePicker';

// ── reusable style constants ──────────────────────────────────────────

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

// ── component ─────────────────────────────────────────────────────────

function SpacePage() {
  const { biz } = useParams<{ biz: string }>();
  const bizName = biz || '';

  // ── Dimensions ──────────────────────────────────────────────────
  const [dimensions, setDimensions] = useState<DimensionInfo[]>([]);
  const [dimLoading, setDimLoading] = useState(true);
  const [dimError, setDimError] = useState<string | null>(null);

  // ── Toast ───────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Tab state ───────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'query' | 'list'>('query');

  // ── Query section ───────────────────────────────────────────────
  const [queryCoords, setQueryCoords] = useState<Record<string, number>>({});
  const [queryDate, setQueryDate] = useState('');
  const [useRangeQuery, setUseRangeQuery] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [queryResult, setQueryResult] = useState<SpaceQueryResponse | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  // ── Write section ───────────────────────────────────────────────
  const [writeCoords, setWriteCoords] = useState<Record<string, number>>({});
  const [writeDate, setWriteDate] = useState('');
  const [writeValue, setWriteValue] = useState<number>(0);
  const [writeResult, setWriteResult] = useState<number | null>(null);
  const [writeLoading, setWriteLoading] = useState(false);
  const [writeError, setWriteError] = useState<string | null>(null);

  // ── Drill-down section ──────────────────────────────────────────
  const [drillCoords, setDrillCoords] = useState<Record<string, number>>({});
  const [drillResults, setDrillResults] = useState<{ coords: Record<string, number>; value: number }[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);

  // ── List section (V2) ───────────────────────────────────────────
  const [listData, setListData] = useState<SpaceCell[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [listTotalPages, setListTotalPages] = useState(0);
  const [listPageNo, setListPageNo] = useState(1);
  const [listPageSize] = useState(20);
  const [dimFilter, setDimFilter] = useState('');
  const [hideZero, setHideZero] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // ── Delete modal (V2) ───────────────────────────────────────────
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SpaceCell | null>(null);
  const [deleteAllDates, setDeleteAllDates] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Accordion (V2) ──────────────────────────────────────────────
  const [accordionOpen, setAccordionOpen] = useState(true);

  // ── fetch dimensions ────────────────────────────────────────────
  const fetchDimensions = useCallback(() => {
    if (!bizName) return;
    setDimLoading(true);
    setDimError(null);
    listDimensions(bizName)
      .then((res) => {
        const dims = res.data?.items || [];
        setDimensions(dims);
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

  // Reset list when biz changes
  useEffect(() => {
    setListData([]);
    setListTotal(0);
    setListTotalPages(0);
    setListPageNo(1);
    setListError(null);
    setDimFilter('');
    setQueryResult(null);
    setQueryError(null);
  }, [bizName]);

  // ── Query handler ───────────────────────────────────────────────
  const handleQuery = () => {
    setQueryLoading(true);
    setQueryError(null);
    setQueryResult(null);

    if (useRangeQuery) {
      if (!dateFrom || !dateTo) {
        setQueryError('请输入起始和结束日期');
        setQueryLoading(false);
        return;
      }
      querySpaceRange(bizName, queryCoords, dateFrom, dateTo)
        .then((res) => setQueryResult(res.data))
        .catch((err) => {
          setQueryError(err.message);
          showToast('区间查询失败: ' + err.message, 'error');
        })
        .finally(() => setQueryLoading(false));
    } else {
      if (!queryDate) {
        setQueryError('请输入日期');
        setQueryLoading(false);
        return;
      }
      const params: SpaceQueryParams = { ...queryCoords, date: queryDate };
      querySpace(bizName, params)
        .then((res) => setQueryResult(res.data))
        .catch((err) => {
          setQueryError(err.message);
          showToast('查询失败: ' + err.message, 'error');
        })
        .finally(() => setQueryLoading(false));
    }
  };

  // ── Write handler ───────────────────────────────────────────────
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
        const affected = res.data?.rowsAffected || 0;
        setWriteResult(affected);
        showToast(`写入成功，影响 ${affected} 行`, 'success');
      })
      .catch((err) => {
        setWriteError(err.message);
        showToast('写入失败: ' + err.message, 'error');
      })
      .finally(() => setWriteLoading(false));
  };

  // ── Drill-down handler ──────────────────────────────────────────
  const handleDrillDown = async () => {
    setDrillLoading(true);
    const results: { coords: Record<string, number>; value: number }[] = [];
    const gtParams: SpaceQueryParams = { ...drillCoords, date: queryDate || writeDate || '20260101' };
    try {
      const gtRes = await querySpace(bizName, gtParams);
      results.push({ coords: { ...drillCoords }, value: gtRes.data?.value ?? 0 });
      for (const dim of dimensions) {
        const newCoords = { ...results[results.length - 1].coords };
        newCoords[dim.columnName] = 1;
        const params: SpaceQueryParams = { ...newCoords, date: gtParams.date };
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

  // ── List fetch (V2) ─────────────────────────────────────────────
  const fetchList = useCallback(
    (page: number) => {
      if (!bizName || dimensions.length === 0) return;
      setListLoading(true);
      setListError(null);
      listSpace(bizName, page, listPageSize, dimFilter || undefined)
        .then((res) => {
          setListData(res.data?.list || []);
          setListTotal(res.data?.total || 0);
          setListTotalPages(res.data?.totalPages || 0);
          setListPageNo(res.data?.pageNo || page);
        })
        .catch((err) => {
          setListError(err.message);
          setListData([]);
        })
        .finally(() => setListLoading(false));
    },
    [bizName, dimensions.length, listPageSize, dimFilter],
  );

  // ── Filter zero-value rows (client-side) ─────────────────────────
  const displayData = hideZero
    ? listData.filter((item) => item.value > 0)
    : listData;
  const displayTotal = hideZero ? displayData.length : listTotal;

  // Auto-fetch list when switching to list tab
  useEffect(() => {
    if (activeTab === 'list' && bizName && dimensions.length > 0) {
      fetchList(1);
    }
  }, [activeTab, bizName, dimensions.length, fetchList]);

  // ── Delete handlers (V2) ────────────────────────────────────────
  const openDeleteModal = (cell: SpaceCell) => {
    setDeleteTarget(cell);
    setDeleteAllDates(false);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const dateParam = deleteAllDates ? undefined : deleteTarget.date;
      await deleteSpaceCell(bizName, deleteTarget.coordinates, dateParam);
      showToast(
        deleteAllDates ? '已删除该坐标的所有日期数据' : `已删除 ${deleteTarget.date} 的数据`,
        'success',
      );
      setDeleteModalOpen(false);
      setDeleteTarget(null);
      // Refresh the list – if we deleted the last item on the page, go back one page
      const targetPage = listData.length <= 1 && listPageNo > 1 ? listPageNo - 1 : listPageNo;
      fetchList(targetPage);
    } catch (err: any) {
      showToast('删除失败: ' + (err.message || '未知错误'), 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Early returns (loading / error / empty dimensions) ──────────
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

  // ── Tab button styles ────────────────────────────────────────────
  const tabBase: React.CSSProperties = {
    padding: '8px 20px',
    borderRadius: '8px 8px 0 0',
    border: 'none',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    background: '#f0f0f0',
    color: '#666',
  };

  const tabActive: React.CSSProperties = {
    ...tabBase,
    background: '#1a73e8',
    color: '#fff',
  };

  // ── Toggle button styles (single / range) ───────────────────────
  const toggleBase: React.CSSProperties = {
    padding: '4px 12px',
    fontSize: '12px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    background: '#f9f9f9',
    cursor: 'pointer',
    fontWeight: 500,
  };
  const toggleActive: React.CSSProperties = {
    ...toggleBase,
    background: '#1a73e8',
    color: '#fff',
    borderColor: '#1a73e8',
  };

  // ── Formatted coordinates helper ─────────────────────────────────
  const fmtCoords = (coords: Record<string, number>) =>
    Object.entries(coords)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');

  // ── Main render ─────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2>数据空间</h2>
          <BizSelector currentBiz={bizName} />
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '0' }}>
        <button
          style={activeTab === 'query' ? tabActive : tabBase}
          onClick={() => setActiveTab('query')}
        >
          🔍 查询模式
        </button>
        <button
          style={activeTab === 'list' ? tabActive : tabBase}
          onClick={() => setActiveTab('list')}
        >
          📋 列表模式
        </button>
      </div>
      <div style={{ height: '3px', background: '#1a73e8', borderRadius: '0 4px 0 0', marginBottom: '20px' }} />

      {/* ── Model Principle Accordion ────────────────────────────── */}
      <div style={{
        background: '#f8f9fc',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
        marginBottom: '20px',
      }}>
        <button
          onClick={() => setAccordionOpen(!accordionOpen)}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '14px',
            fontWeight: 600,
            color: '#333',
          }}
        >
          <span>🧠 模型原理</span>
          <span style={{ fontSize: '18px', transition: 'transform 0.2s', transform: accordionOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
            ▶
          </span>
        </button>
        {accordionOpen && (
          <div style={{ padding: '0 16px 16px 16px', fontSize: '13px', lineHeight: '1.8', color: '#555' }}>
            <p style={{ margin: '0 0 8px 0' }}>
              <strong>当前业务维度数:</strong> {dimensions.length}{' '}
              → <strong>坐标组合数:</strong> 2<sup>{dimensions.length}</sup> = {Math.pow(2, dimensions.length).toLocaleString()}
            </p>
            <div style={{ background: '#fff', borderRadius: '6px', padding: '12px', border: '1px solid #e8e8e8' }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>简化原理</p>
              <ul style={{ margin: '0', paddingLeft: '18px' }}>
                <li>每个维度有 (leafMax − leafMin + 1) 个叶子值，外加 1 个 <strong>ALL (0)</strong> 哨兵值</li>
                <li>所有维度值的笛卡尔积生成全部坐标组合（共 2<sup>d</sup> 个）</li>
                <li>写入一个具体坐标时，自动<strong>级联更新</strong>所有包含 ALL 的汇总行</li>
                <li>查询时 <strong>O(1)</strong> 直接命中目标坐标组合，无需实时聚合</li>
              </ul>
            </div>
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
              📐 维度列表:
              {dimensions.map((d) => (
                <span key={d.columnName} style={{ marginLeft: '8px' }}>
                  <strong>{d.displayName}</strong>({d.columnName}): {d.leafMin}~{d.leafMax}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Tab: Query mode ──────────────────────────────────────── */}
      {activeTab === 'query' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Left column: Query + Write */}
          <div>
            {/* ── Query Section ──────────────────────────────────── */}
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>🔍 坐标查询</h3>
              <CoordinateInput
                dimensions={dimensions}
                values={queryCoords}
                onChange={setQueryCoords}
                allowZero={true}
              />

              {/* Query mode toggle */}
              <div style={{ marginTop: '16px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#666', marginRight: '4px' }}>查询模式:</span>
                <button
                  style={!useRangeQuery ? toggleActive : toggleBase}
                  onClick={() => setUseRangeQuery(false)}
                >
                  单日
                </button>
                <button
                  style={useRangeQuery ? toggleActive : toggleBase}
                  onClick={() => setUseRangeQuery(true)}
                >
                  区间
                </button>
              </div>

              {/* Date input: single or range */}
              <div style={{ marginTop: '12px' }}>
                {!useRangeQuery ? (
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
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
                  </div>
                ) : (
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '13px' }}>
                      日期区间 (from → to)
                    </label>
                    <DateRangePicker
                      dateFrom={dateFrom}
                      dateTo={dateTo}
                      onChange={(from, to) => { setDateFrom(from); setDateTo(to); }}
                    />
                  </div>
                )}
              </div>

              {/* Query button */}
              <div style={{ marginTop: '16px' }}>
                <button
                  onClick={handleQuery}
                  disabled={queryLoading}
                  style={{
                    background: '#1a73e8', color: '#fff', border: 'none',
                    padding: '10px 24px', borderRadius: '8px', fontWeight: 600,
                    opacity: queryLoading ? 0.6 : 1, cursor: queryLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {queryLoading ? '查询中...' : '查询'}
                </button>
              </div>

              {queryError && <ErrorBanner message={queryError} />}

              {/* Query result */}
              {queryResult && (
                <div style={{
                  marginTop: '16px', background: '#f5f7fa', borderRadius: '8px',
                  padding: '16px',
                }}>
                  <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>坐标</div>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>
                        {fmtCoords(queryResult.coordinates || queryCoords)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>日期</div>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>
                        {queryResult.dateFrom && queryResult.dateTo
                          ? `${queryResult.dateFrom} → ${queryResult.dateTo}`
                          : queryResult.date}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>指标值</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: '#1a73e8' }}>
                        {queryResult.value?.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  {/* Range metadata */}
                  {queryResult.aggregationMethod && (
                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#666', flexWrap: 'wrap' }}>
                      <span>聚合方式: <strong>{queryResult.aggregationMethod}</strong></span>
                      {queryResult.scannedDates !== undefined && (
                        <span>扫描天数: <strong>{queryResult.scannedDates}</strong></span>
                      )}
                    </div>
                  )}
                  {queryResult.warning && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#e65100', background: '#fff3e0', padding: '6px 10px', borderRadius: '4px' }}>
                      ⚠ {queryResult.warning}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Write Section ──────────────────────────────────── */}
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
                    cursor: (writeLoading || !writeDate) ? 'not-allowed' : 'pointer',
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
                    cursor: (drillLoading || (!queryDate && !writeDate)) ? 'not-allowed' : 'pointer',
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
                            {fmtCoords(result.coords)}
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
      )}

      {/* ── Tab: List mode (V2) ──────────────────────────────────── */}
      {activeTab === 'list' && (
        <div>
          {/* Filter + Refresh bar */}
          <div style={{
            ...sectionStyle,
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            padding: '16px 24px',
          }}>
            <div style={{ flex: 1, minWidth: '250px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '13px' }}>
                维度过滤（可选）
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={dimFilter}
                  onChange={(e) => setDimFilter(e.target.value)}
                  placeholder="例: app:1,statusCode:200"
                  style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px' }}
                  onKeyDown={(e) => { if (e.key === 'Enter') fetchList(1); }}
                />
                <button
                  onClick={() => fetchList(1)}
                  disabled={listLoading}
                  style={{
                    padding: '8px 16px', borderRadius: '6px', border: '1px solid #1a73e8',
                    background: '#1a73e8', color: '#fff', fontWeight: 600, fontSize: '13px',
                    cursor: listLoading ? 'not-allowed' : 'pointer', opacity: listLoading ? 0.6 : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {listLoading ? '查询中...' : '搜索'}
                </button>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: '6px',
                  border: '1px solid #ddd', fontSize: '13px',
                  cursor: 'pointer', userSelect: 'none',
                  background: hideZero ? '#e8f5e9' : '#fff',
                }} title={hideZero ? '点击显示全部（含零值）' : '点击隐藏零值'}>
                  <input
                    type="checkbox"
                    checked={hideZero}
                    onChange={(e) => setHideZero(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  仅非零
                </label>
              </div>
            </div>
          </div>

          {/* Error */}
          {listError && <ErrorBanner message={listError} onRetry={() => fetchList(listPageNo)} />}

          {/* Table */}
          {!listLoading && !listError && displayData.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
              <p style={{ fontSize: '16px', marginBottom: '8px' }}>暂无数据</p>
              <p style={{ fontSize: '13px' }}>
                {dimFilter ? '尝试调整维度过滤条件' : '该业务暂无 Space 数据记录'}
              </p>
            </div>
          )}

          {listLoading && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Loading />
            </div>
          )}

          {displayData.length > 0 && (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f5f7fa', borderBottom: '2px solid #e0e0e0' }}>
                      <th style={thStyle}>坐标</th>
                      <th style={thStyle}>日期</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>数值</th>
                      <th style={{ ...thStyle, textAlign: 'center', width: '80px' }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayData.map((cell, idx) => (
                      <tr
                        key={`${fmtCoords(cell.coordinates)}-${cell.date}-${idx}`}
                        style={{ borderBottom: '1px solid #eee', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}
                      >
                        <td style={tdStyle}>
                          <span style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                            {fmtCoords(cell.coordinates)}
                          </span>
                        </td>
                        <td style={tdStyle}>{cell.date}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#1a73e8' }}>
                          {cell.value.toLocaleString()}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <button
                            onClick={() => openDeleteModal(cell)}
                            style={{
                              padding: '4px 12px',
                              fontSize: '12px',
                              borderRadius: '4px',
                              border: '1px solid #c62828',
                              background: '#fff',
                              color: '#c62828',
                              cursor: 'pointer',
                              fontWeight: 500,
                            }}
                          >
                            删除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                gap: '16px', marginTop: '16px', padding: '12px 0',
              }}>
                <button
                  onClick={() => fetchList(listPageNo - 1)}
                  disabled={listPageNo <= 1 || listLoading}
                  style={pageBtnStyle(listPageNo <= 1 || listLoading)}
                >
                  ← 上一页
                </button>
                <span style={{ fontSize: '13px', color: '#666' }}>
                  第 <strong>{listPageNo}</strong>/{listTotalPages} 页 (共 {listTotal} 条{hideZero && listTotal !== displayTotal ? `, 非零 ${displayTotal} 条` : ""})
                </span>
                <button
                  onClick={() => fetchList(listPageNo + 1)}
                  disabled={listPageNo >= listTotalPages || listLoading}
                  style={pageBtnStyle(listPageNo >= listTotalPages || listLoading)}
                >
                  下一页 →
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Delete Confirmation Modal ────────────────────────────── */}
      {deleteModalOpen && deleteTarget && (
        <div
          style={modalOverlayStyle}
          onClick={() => { if (!deleteLoading) setDeleteModalOpen(false); }}
        >
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 700 }}>确认删除</h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#666' }}>
              确定要删除以下数据吗？此操作不可撤销。
            </p>
            <div style={{
              background: '#f5f5f5', padding: '12px', borderRadius: '6px',
              marginBottom: '12px', fontSize: '13px', lineHeight: '1.6',
            }}>
              <div><strong>坐标:</strong> {fmtCoords(deleteTarget.coordinates)}</div>
              <div><strong>日期:</strong> {deleteTarget.date}</div>
              <div><strong>指标值:</strong> {deleteTarget.value.toLocaleString()}</div>
            </div>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '13px', marginBottom: '16px', cursor: 'pointer',
              color: '#c62828',
            }}>
              <input
                type="checkbox"
                checked={deleteAllDates}
                onChange={(e) => setDeleteAllDates(e.target.checked)}
                disabled={deleteLoading}
              />
              删除该坐标的<strong>所有日期</strong>数据（整行删除）
            </label>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleteLoading}
                style={modalCancelBtnStyle}
              >
                取消
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                style={modalConfirmBtnStyle(deleteLoading)}
              >
                {deleteLoading ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ────────────────────────────────────────────────── */}
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

// ── Table cell styles ──────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  fontWeight: 700,
  fontSize: '12px',
  color: '#555',
  textTransform: 'uppercase',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  color: '#333',
};

// ── Pagination button helper ───────────────────────────────────────

function pageBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '6px 16px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    background: disabled ? '#f5f5f5' : '#fff',
    color: disabled ? '#ccc' : '#333',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '13px',
    fontWeight: 500,
  };
}

// ── Modal styles ───────────────────────────────────────────────────

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1500,
};

const modalContentStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: '12px',
  padding: '24px',
  maxWidth: '480px',
  width: '90%',
  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
};

const modalCancelBtnStyle: React.CSSProperties = {
  padding: '8px 20px',
  borderRadius: '6px',
  border: '1px solid #ddd',
  background: '#fff',
  color: '#666',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 500,
};

function modalConfirmBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '8px 20px',
    borderRadius: '6px',
    border: 'none',
    background: disabled ? '#ef9a9a' : '#c62828',
    color: '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '13px',
    fontWeight: 600,
  };
}

export default SpacePage;
