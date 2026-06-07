import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { ApiResponse } from '../api/types';
import ErrorBanner from '../components/ErrorBanner';
import Loading from '../components/Loading';

function HomePage() {
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkHealth = () => {
    setLoading(true);
    setError(null);
    client.get<any, ApiResponse<Record<string, unknown>>>('/health')
      .then((res) => {
        setHealth(res.data);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { checkHealth(); }, []);

  const conceptCards = [
    { title: '坐标空间', desc: '多维坐标定位数据，每维 0=ALL 哨兵实现上卷' },
    { title: '上卷查询', desc: '任意维度组合即时聚合，无需实时计算' },
    { title: '级联更新', desc: '写入一条数据自动更新所有聚合级别' },
    { title: '零聚合', desc: '查询 = 定位 + 读取，O(1) 响应时间' },
  ];

  return (
    <div>
      {/* Health status */}
      {loading ? <Loading /> : error ? (
        <ErrorBanner message={`后端服务不可用: ${error}`} onRetry={checkHealth} />
      ) : (
        <div style={{
          background: health && (health as any).status === 'UP' ? '#e8f5e9' : '#fff3f3',
          padding: '10px 20px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px',
        }}>
          {health && (health as any).status === 'UP' ? '✅ 服务运行正常' : '⚠️ 服务异常'}
        </div>
      )}

      {/* Concept cards */}
      <h2 style={{ marginBottom: '16px' }}>核心概念</h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px',
        marginBottom: '32px',
      }}>
        {conceptCards.map((card) => (
          <div key={card.title} style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #eee',
          }}>
            <h3 style={{ marginBottom: '8px', color: '#1a73e8' }}>{card.title}</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>{card.desc}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <h2 style={{ marginBottom: '16px' }}>快速开始</h2>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <Link to="/biz" style={{
          background: '#1a73e8',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: 600,
        }}>
          注册新业务
        </Link>
        <Link to="/docs" style={{
          background: '#fff',
          color: '#1a73e8',
          padding: '12px 24px',
          borderRadius: '8px',
          textDecoration: 'none',
          border: '1px solid #1a73e8',
          fontWeight: 600,
        }}>
          查看文档
        </Link>
      </div>
    </div>
  );
}

export default HomePage;
