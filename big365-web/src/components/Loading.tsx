function Loading() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      color: '#999',
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        border: '3px solid #e0e0e0',
        borderTopColor: '#1a73e8',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        marginRight: '12px',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span>加载中...</span>
    </div>
  );
}

export default Loading;
