interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div style={{
      background: '#fff3f3',
      border: '1px solid #ffcdd2',
      borderRadius: '8px',
      padding: '12px 20px',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      color: '#c62828',
      fontSize: '14px',
    }}>
      <span>⚠️ {message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            background: '#c62828',
            color: '#fff',
            border: 'none',
            padding: '4px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          重试
        </button>
      )}
    </div>
  );
}

export default ErrorBanner;
