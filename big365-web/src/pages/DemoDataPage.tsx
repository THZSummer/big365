import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { createDemoJob, getDemoJob } from '../api/demo';
import type { DemoJobInfo } from '../api/types';
import ErrorBanner from '../components/ErrorBanner';
import Loading from '../components/Loading';
import BizSelector from '../components/BizSelector';

function DemoDataPage() {
  const { biz } = useParams<{ biz: string }>();
  const bizName = biz || '';

  const [jobs, setJobs] = useState<DemoJobInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Create job
  const [scale, setScale] = useState<'small' | 'medium' | 'large'>('small');
  const [dateFrom, setDateFrom] = useState('20260101');
  const [dateTo, setDateTo] = useState('20260107');
  const [creating, setCreating] = useState(false);

  // Polling
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Poll in-progress jobs
  useEffect(() => {
    const inProgressJobs = jobs.filter(
      (j) => j.status !== 'completed' && j.status !== 'failed'
    );
    if (inProgressJobs.length === 0) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    if (!pollingRef.current) {
      pollingRef.current = setInterval(() => {
        inProgressJobs.forEach((job) => {
          getDemoJob(bizName, job.jobId)
            .then((res) => {
              setJobs((prev) =>
                prev.map((j) =>
                  j.jobId === job.jobId ? (res.data as DemoJobInfo) : j
                )
              );
            })
            .catch(() => {});
        });
      }, 2000);
    }
  }, [jobs, bizName]);

  const handleCreate = () => {
    setCreating(true);
    setError(null);
    createDemoJob(bizName, {
      scale,
      date_range: { from: dateFrom, to: dateTo },
    })
      .then((res) => {
        const newJob: DemoJobInfo = {
          jobId: res.data?.jobId || '',
          bizName,
          scale,
          status: 'pending',
          progress: 0,
          summary: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setJobs((prev) => [newJob, ...prev]);
        showToast('生成任务已创建', 'success');
      })
      .catch((err) => {
        showToast('创建失败: ' + err.message, 'error');
        setError(err.message);
      })
      .finally(() => setCreating(false));
  };

  const statusLabel = (status: string): string => {
    const map: Record<string, string> = {
      pending: '等待中',
      initializing: '初始化',
      generating: '生成中',
      writing: '写入中',
      summarizing: '汇总中',
      completed: '已完成',
      failed: '失败',
    };
    return map[status] || status;
  };

  const statusColor = (status: string): string => {
    if (status === 'completed') return '#2e7d32';
    if (status === 'failed') return '#c62828';
    return '#e65100';
  };

  const statusBg = (status: string): string => {
    if (status === 'completed') return '#e8f5e9';
    if (status === 'failed') return '#ffebee';
    return '#fff3e0';
  };

  const sectionStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #eee',
    marginBottom: '20px',
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2>演示数据</h2>
          <BizSelector currentBiz={bizName} />
        </div>
      </div>

      {/* Create Job Section */}
      <div style={sectionStyle}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>⚡ 创建生成任务</h3>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {/* Scale selector */}
          <div style={{ minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '13px' }}>
              数据规模
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['small', 'medium', 'large'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setScale(s)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: scale === s ? '2px solid #1a73e8' : '1px solid #ddd',
                    background: scale === s ? '#e3f2fd' : '#fff',
                    color: scale === s ? '#1a73e8' : '#666',
                    fontWeight: 600,
                    fontSize: '13px',
                  }}
                >
                  {s === 'small' ? '小样例' : s === 'medium' ? '万级' : '百万级'}
                </button>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '13px' }}>
              开始日期
            </label>
            <input
              type="text"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ width: '130px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
              placeholder="20260101"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '13px' }}>
              结束日期
            </label>
            <input
              type="text"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ width: '130px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
              placeholder="20260107"
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={creating || !bizName}
            style={{
              background: '#1a73e8', color: '#fff', border: 'none',
              padding: '10px 24px', borderRadius: '8px', fontWeight: 600,
              opacity: (creating || !bizName) ? 0.6 : 1,
              height: '42px',
            }}
          >
            {creating ? '创建中...' : '创建生成任务'}
          </button>
        </div>

        {error && <ErrorBanner message={error} />}
      </div>

      {/* Job List */}
      <div style={sectionStyle}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
          📋 任务列表 {jobs.length > 0 && `(${jobs.length})`}
        </h3>

        {jobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <p style={{ fontSize: '15px', marginBottom: '8px' }}>暂无生成任务</p>
            <p style={{ fontSize: '13px' }}>选择规模和日期范围后，点击「创建生成任务」开始</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {jobs.map((job) => {
              const isExpanded = expandedJob === job.jobId;
              const isRunning = job.status !== 'completed' && job.status !== 'failed';

              return (
                <div
                  key={job.jobId}
                  style={{
                    background: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #eee',
                    overflow: 'hidden',
                  }}
                >
                  {/* Job Header */}
                  <div
                    style={{
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: job.status === 'completed' || job.status === 'failed' ? 'pointer' : 'default',
                    }}
                    onClick={() => {
                      if (job.status === 'completed' || job.status === 'failed') {
                        setExpandedJob(isExpanded ? null : job.jobId);
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>
                          <code style={{
                            background: '#f0f4ff', padding: '2px 8px', borderRadius: '4px', fontSize: '11px',
                          }}>
                            {job.jobId}
                          </code>
                        </div>
                        <div style={{ fontSize: '12px', color: '#999' }}>
                          {job.scale} · {new Date(job.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <div style={{ flex: 1, marginLeft: '20px' }}>
                        {isRunning && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              flex: 1, height: '8px', background: '#eee', borderRadius: '4px', overflow: 'hidden',
                            }}>
                              <div style={{
                                width: `${Math.min(job.progress || 0, 100)}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #1a73e8, #64b5f6)',
                                borderRadius: '4px',
                                transition: 'width 0.6s ease',
                                animation: isRunning ? 'pulse 2s ease-in-out infinite' : undefined,
                              }} />
                            </div>
                            <span style={{ fontSize: '12px', color: '#666', minWidth: '40px' }}>
                              {job.progress || 0}%
                            </span>
                          </div>
                        )}
                      </div>

                      <span style={{
                        display: 'inline-block',
                        padding: '4px 14px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: statusBg(job.status),
                        color: statusColor(job.status),
                        minWidth: '70px',
                        textAlign: 'center',
                      }}>
                        {statusLabel(job.status)}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar animation style */}
                  <style>{`
                    @keyframes pulse {
                      0%, 100% { opacity: 1; }
                      50% { opacity: 0.7; }
                    }
                  `}</style>

                  {/* Expanded Summary */}
                  {isExpanded && (
                    <div style={{
                      padding: '16px',
                      borderTop: '1px solid #eee',
                      background: '#fff',
                      fontSize: '13px',
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: '8px', color: '#555' }}>
                        {job.status === 'completed' ? '✅ 生成摘要' : '❌ 失败原因'}
                      </div>
                      <pre style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        color: '#333',
                        fontSize: '12px',
                        lineHeight: 1.6,
                        margin: 0,
                      }}>
                        {job.summary || '暂无详细信息'}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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

export default DemoDataPage;
