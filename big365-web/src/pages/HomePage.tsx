import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { listBiz } from '../api/biz';
import { querySpace } from '../api/space';
import { checkHealth } from '../api/health';
import type { ApiResponse, DemoSummaryData, HealthStatus } from '../api/types';
import ErrorBanner from '../components/ErrorBanner';
import Loading from '../components/Loading';

// ── Date helpers ──────────────────────────────────────────────

const formatDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
};

const daysAgo = (n: number): string => {
  const d = new Date(Date.now() - n * 86_400_000);
  return formatDate(d);
};

// ── Constants ─────────────────────────────────────────────────

const APP_VALUES = [1, 2, 3];
const DEMO_BIZ_NAME = 'demo_logs';

// ── Component ─────────────────────────────────────────────────

function HomePage() {
  // ── Health check state (independent) ──
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  const checkHealthStatus = useCallback(() => {
    setHealthLoading(true);
    setHealthError(null);
    checkHealth()
      .then((res) => {
        setHealth(res.data);
        setHealthError(null);
      })
      .catch((err) => setHealthError(err.message))
      .finally(() => setHealthLoading(false));
  }, []);

  // ── Demo data state ──
  const [demoLoading, setDemoLoading] = useState(true);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoData, setDemoData] = useState<DemoSummaryData | null>(null);
  const [hasDemoLogs, setHasDemoLogs] = useState(false);

  const loadDemoData = useCallback(async () => {
    setDemoLoading(true);
    setDemoError(null);

    const today = formatDate(new Date());
    const sevenDaysAgo = daysAgo(7);

    try {
      const promises = APP_VALUES.map((app) =>
        querySpace(DEMO_BIZ_NAME, {
          app,
          endpoint: 0,
          statusCode: 0,
          env: 0,
          region: 0,
          dateFrom: sevenDaysAgo,
          dateTo: today,
        }),
      );

      const results = await Promise.all(promises);

      const appResults = results.map((res, idx) => ({
        app: APP_VALUES[idx],
        value: res.data?.value ?? 0,
      }));

      setDemoData({
        dateFrom: sevenDaysAgo,
        dateTo: today,
        scannedDates: results[0]?.data?.scannedDates ?? 7,
        appResults,
      });
      setDemoError(null);
    } catch (err: any) {
      setDemoError(err.message || '无法加载预置演示数据');
      setDemoData(null);
    } finally {
      setDemoLoading(false);
    }
  }, []);

  // ── Initial load ──
  useEffect(() => {
    // Health check (fire-and-forget, independent)
    checkHealthStatus();

    // Demo data detection + loading
    (async () => {
      try {
        const bizRes = await listBiz();
        const items = bizRes.data?.items || [];
        const demoBiz = items.find((b) => b.bizName === DEMO_BIZ_NAME);

        if (!demoBiz) {
          setHasDemoLogs(false);
          setDemoLoading(false);
          return;
        }

        setHasDemoLogs(true);
        await loadDemoData();
      } catch {
        // listBiz failed → treat as no demo_logs (graceful fallback)
        setHasDemoLogs(false);
        setDemoLoading(false);
      }
    })();
  }, [checkHealthStatus, loadDemoData]);

  // ── Concept cards (always rendered) ──
  const conceptCards = [
    { title: '坐标空间', desc: '多维坐标定位数据，每维 0=ALL 哨兵实现上卷' },
    { title: '上卷查询', desc: '任意维度组合即时聚合，无需实时计算' },
    { title: '级联更新', desc: '写入一条数据自动更新所有聚合级别' },
    { title: '零聚合', desc: '查询 = 定位 + 读取，O(1) 响应时间' },
  ];

  // ── Styles ──
  const sectionStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #eee',
    marginBottom: '20px',
  };

  const totalValue = demoData
    ? demoData.appResults.reduce((sum, r) => sum + r.value, 0)
    : 0;

  return (
    <div>
      {/* ── Health status ── */}
      {healthLoading ? (
        <Loading />
      ) : healthError ? (
        <ErrorBanner message={`后端服务不可用: ${healthError}`} onRetry={checkHealthStatus} />
      ) : (
        <div
          style={{
            background: health && health.status === 'UP' ? '#e8f5e9' : '#fff3f3',
            padding: '10px 20px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
          }}
        >
          {health && health.status === 'UP'
            ? '🟢 服务运行正常'
            : '⚠️ 服务异常'}
        </div>
      )}

      {/* ── Demo data section ── */}
      {demoLoading && (
        <div style={sectionStyle}>
          <Loading />
          <p style={{ textAlign: 'center', color: '#999', marginTop: 8 }}>
            正在加载预置演示数据...
          </p>
        </div>
      )}

      {!demoLoading && demoError && (
        <div style={sectionStyle}>
          <ErrorBanner message={demoError} onRetry={loadDemoData} />
        </div>
      )}

      {!demoLoading && !demoError && hasDemoLogs && demoData && (
        <div style={sectionStyle}>
          <h2 style={{ marginBottom: '4px', fontSize: '18px' }}>
            📊 预置演示：日志分析 ({DEMO_BIZ_NAME})
          </h2>
          <p style={{ fontSize: '13px', color: '#888', marginBottom: '16px' }}>
            最近 7 天各应用请求量汇总（{demoData.dateFrom} ~ {demoData.dateTo}
            {demoData.scannedDates > 0 && `，扫描 ${demoData.scannedDates} 天`}）
          </p>

          {/* Summary table */}
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginBottom: '16px',
              fontSize: '14px',
            }}
          >
            <thead>
              <tr style={{ background: '#f5f7fa', borderBottom: '2px solid #e0e0e0' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>
                  应用
                </th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>
                  7 天请求量
                </th>
              </tr>
            </thead>
            <tbody>
              {demoData.appResults.map((r) => (
                <tr
                  key={r.app}
                  style={{ borderBottom: '1px solid #f0f0f0' }}
                >
                  <td style={{ padding: '10px 16px', fontWeight: 500 }}>
                    app={r.app}
                  </td>
                  <td
                    style={{
                      padding: '10px 16px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: '#1a73e8',
                      fontSize: '16px',
                    }}
                  >
                    {r.value.toLocaleString()}
                  </td>
                </tr>
              ))}
              <tr
                style={{
                  background: '#fafafa',
                  borderTop: '2px solid #e0e0e0',
                  fontWeight: 700,
                }}
              >
                <td style={{ padding: '10px 16px' }}>合计</td>
                <td
                  style={{
                    padding: '10px 16px',
                    textAlign: 'right',
                    color: '#1a73e8',
                    fontSize: '18px',
                  }}
                >
                  {totalValue.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Drill-down CTA */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link
              to={`/biz/${DEMO_BIZ_NAME}/space`}
              style={{
                background: '#1a73e8',
                color: '#fff',
                padding: '10px 24px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              🔍 进入下钻分析
            </Link>
            <button
              onClick={loadDemoData}
              style={{
                background: '#fff',
                color: '#1a73e8',
                padding: '10px 24px',
                borderRadius: '8px',
                border: '1px solid #1a73e8',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              🔄 刷新数据
            </button>
          </div>
        </div>
      )}

      {/* Empty state: demo_logs not found (no error, just proceed to concept cards) */}
      {!demoLoading && !demoError && !hasDemoLogs && (
        <div style={{ ...sectionStyle, background: '#f9fafb' }}>
          <p style={{ textAlign: 'center', color: '#888', margin: 0 }}>
            💡 首次启动时将自动创建预置演示数据（demo_logs 业务）。重启服务即可体验。
          </p>
        </div>
      )}

      {/* ── Concept cards (always visible) ── */}
      <h2 style={{ marginBottom: '16px' }}>📚 核心概念</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        {conceptCards.map((card) => (
          <div
            key={card.title}
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              border: '1px solid #eee',
            }}
          >
            <h3 style={{ marginBottom: '8px', color: '#1a73e8' }}>{card.title}</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>{card.desc}</p>
          </div>
        ))}
      </div>

      {/* ── Quick actions (always visible) ── */}
      <h2 style={{ marginBottom: '16px' }}>🚀 快速开始</h2>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <Link
          to="/biz"
          style={{
            background: '#1a73e8',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          注册新业务
        </Link>
        <Link
          to="/docs"
          style={{
            background: '#fff',
            color: '#1a73e8',
            padding: '12px 24px',
            borderRadius: '8px',
            textDecoration: 'none',
            border: '1px solid #1a73e8',
            fontWeight: 600,
          }}
        >
          查看文档
        </Link>
      </div>
    </div>
  );
}

export default HomePage;
