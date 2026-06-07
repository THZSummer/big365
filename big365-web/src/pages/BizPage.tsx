import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { ApiResponse, PageResponse, BizInfo, BizRegisterRequest } from '../api/types';
import ErrorBanner from '../components/ErrorBanner';
import Loading from '../components/Loading';

function BizPage() {
  const [bizList, setBizList] = useState<BizInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [form, setForm] = useState({
    biz_name: '',
    biz_label: '',
    dimensions: [{ columnName: '', displayName: '', leafMin: 1, leafMax: 10 }],
    dateRangeFrom: '20260101',
    dateRangeTo: '20260107',
  });

  const fetchBizList = useCallback(() => {
    setLoading(true);
    client.get<any, ApiResponse<PageResponse<BizInfo>>>('/biz/list')
      .then((res) => {
        setBizList(res.data?.items || []);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchBizList(); }, [fetchBizList]);

  const handleRegister = () => {
    setRegError(null);
    const request: BizRegisterRequest = {
      biz_name: form.biz_name,
      biz_label: form.biz_label,
      dimensions: form.dimensions.map((d) => ({
        columnName: d.columnName,
        displayName: d.displayName,
        leafMin: d.leafMin,
        leafMax: d.leafMax,
      })),
      date_range: { from: form.dateRangeFrom, to: form.dateRangeTo },
    };

    client.post<any, ApiResponse<{ tables_created: string[] }>>('/biz/register', request)
      .then(() => {
        setShowModal(false);
        fetchBizList();
      })
      .catch((err) => setRegError(err.message));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>业务管理</h2>
        <button onClick={() => setShowModal(true)} style={{
          background: '#1a73e8', color: '#fff', border: 'none',
          padding: '10px 20px', borderRadius: '8px', fontWeight: 600,
        }}>
          注册新业务
        </button>
      </div>

      {loading ? <Loading /> : error ? <ErrorBanner message={error} onRetry={fetchBizList} /> : (
        bizList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>
            <p style={{ fontSize: '18px', marginBottom: '12px' }}>暂无业务</p>
            <p>点击「注册新业务」开始使用</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {bizList.map((biz) => (
              <div key={biz.bizName} style={{
                background: '#fff', borderRadius: '8px', padding: '16px 20px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}>
                <div>
                  <strong style={{ fontSize: '16px' }}>{biz.bizLabel}</strong>
                  <span style={{ marginLeft: '12px', color: '#999', fontSize: '13px' }}>
                    {biz.bizName} · {biz.dimensionCount} 维度 · {biz.status}
                  </span>
                </div>
                <Link to={`/biz/${biz.bizName}/space`} style={{
                  background: '#e3f2fd', color: '#1a73e8', padding: '6px 20px',
                  borderRadius: '6px', textDecoration: 'none', fontWeight: 600,
                }}>
                  进入
                </Link>
              </div>
            ))}
          </div>
        )
      )}

      {/* Register Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: '#fff', borderRadius: '12px', padding: '32px',
            width: '520px', maxHeight: '80vh', overflow: 'auto',
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '20px' }}>注册新业务</h3>

            {regError && <ErrorBanner message={regError} />}

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>业务名称 (biz_name)</label>
              <input value={form.biz_name} onChange={(e) => setForm({ ...form, biz_name: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
                placeholder="例: log_monitor" />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>业务描述 (biz_label)</label>
              <input value={form.biz_label} onChange={(e) => setForm({ ...form, biz_label: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
                placeholder="例: 日志监控" />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>维度定义</label>
              {form.dimensions.map((dim, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input placeholder="列名" value={dim.columnName}
                    onChange={(e) => {
                      const d = [...form.dimensions]; d[idx].columnName = e.target.value; setForm({ ...form, dimensions: d });
                    }} style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }} />
                  <input placeholder="显示名" value={dim.displayName}
                    onChange={(e) => {
                      const d = [...form.dimensions]; d[idx].displayName = e.target.value; setForm({ ...form, dimensions: d });
                    }} style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }} />
                  <input type="number" placeholder="min" value={dim.leafMin}
                    onChange={(e) => {
                      const d = [...form.dimensions]; d[idx].leafMin = +e.target.value; setForm({ ...form, dimensions: d });
                    }} style={{ width: '60px', padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }} />
                  <input type="number" placeholder="max" value={dim.leafMax}
                    onChange={(e) => {
                      const d = [...form.dimensions]; d[idx].leafMax = +e.target.value; setForm({ ...form, dimensions: d });
                    }} style={{ width: '60px', padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }} />
                  <button onClick={() => {
                    setForm({ ...form, dimensions: form.dimensions.filter((_, i) => i !== idx) });
                  }} style={{ background: '#ffebee', color: '#c62828', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
              <button onClick={() => setForm({
                ...form,
                dimensions: [...form.dimensions, { columnName: '', displayName: '', leafMin: 1, leafMax: 10 }]
              })} style={{
                background: '#e3f2fd', color: '#1a73e8', border: 'none',
                padding: '4px 12px', borderRadius: '4px', fontSize: '13px',
              }}>
                + 添加维度
              </button>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>开始日期</label>
                <input value={form.dateRangeFrom} onChange={(e) => setForm({ ...form, dateRangeFrom: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>结束日期</label>
                <input value={form.dateRangeTo} onChange={(e) => setForm({ ...form, dateRangeTo: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{
                background: '#eee', border: 'none', padding: '10px 20px', borderRadius: '8px',
              }}>取消</button>
              <button onClick={handleRegister} style={{
                background: '#1a73e8', color: '#fff', border: 'none',
                padding: '10px 24px', borderRadius: '8px', fontWeight: 600,
              }}>注册</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BizPage;
