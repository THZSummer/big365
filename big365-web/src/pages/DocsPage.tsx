function DocsPage() {
  const docs = [
    { title: '快速开始', desc: '从零启动 big365', link: 'docs/quick-start.md' },
    { title: '概念模型', desc: '理解 Dimension / Coordinate / Vector', link: 'docs/concepts.md' },
    { title: 'API 文档', desc: 'REST API 接口参考', link: '/swagger-ui.html' },
    { title: '日志分析教程', desc: '完整端到端示例', link: 'docs/log-analysis-tutorial.md' },
  ];

  return (
    <div>
      <h2>文档</h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px',
        marginTop: '20px',
      }}>
        {docs.map((doc) => (
          <a key={doc.title} href={doc.link} style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #eee',
            textDecoration: 'none',
            color: 'inherit',
            transition: 'box-shadow 0.2s',
          }}>
            <h3 style={{ marginBottom: '8px', color: '#1a73e8' }}>{doc.title}</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>{doc.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
}

export default DocsPage;
