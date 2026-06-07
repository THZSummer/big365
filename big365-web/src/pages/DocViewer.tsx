import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Route-level doc viewer: renders /docs/{name}.md as HTML */
function DocViewer() {
  const { name } = useParams<{ name: string }>();
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const path = `/docs/${name}.md`;
    fetch(path)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then(setContent)
      .catch((e) => setError(`无法加载文档 "${name}": ${e.message}`));
  }, [name]);

  if (error) {
    return <div style={{ padding: 40, color: '#d32f2f' }}>⚠️ {error}</div>;
  }
  if (!content) {
    return <div style={{ padding: 40, color: '#888' }}>加载中...</div>;
  }

  return (
    <div style={{
      maxWidth: '860px',
      margin: '0 auto',
      padding: '20px 24px 40px',
      background: '#fff',
      borderRadius: '8px',
      boxShadow: '0 1px 4px rgba(0,0,0,.08)',
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif',
      fontSize: '15px',
      lineHeight: '1.7',
      color: '#333',
    }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

export default DocViewer;
