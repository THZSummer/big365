import { useState } from 'react';

/** Returns a yyyyMMdd string for today + offset days (negative = past) */
function getDateString(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

interface DateRangePickerProps {
  dateFrom: string;
  dateTo: string;
  onChange: (dateFrom: string, dateTo: string) => void;
  disabled?: boolean;
}

function DateRangePicker({ dateFrom, dateTo, onChange, disabled = false }: DateRangePickerProps) {
  const [error, setError] = useState<string | null>(null);

  /** Validate and call onChange */
  const validateAndChange = (from: string, to: string) => {
    if (from && to && from.length === 8 && to.length === 8 && from > to) {
      setError('开始日期不能晚于结束日期');
    } else {
      setError(null);
    }
    onChange(from, to);
  };

  const handleFromChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 8);
    validateAndChange(cleaned, dateTo);
  };

  const handleToChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 8);
    validateAndChange(dateFrom, cleaned);
  };

  const setQuickRange = (days: number) => {
    const today = getDateString(0);
    const past = getDateString(-days);
    validateAndChange(past, today);
  };

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: '6px',
    border: error ? '1px solid #c62828' : '1px solid #ddd',
    fontSize: '13px',
    outline: 'none',
    width: '150px',
  };

  const btnStyle: React.CSSProperties = {
    padding: '4px 10px',
    fontSize: '11px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    background: '#f9f9f9',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    whiteSpace: 'nowrap',
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={dateFrom}
          onChange={(e) => handleFromChange(e.target.value)}
          placeholder="起始 例:20260601"
          disabled={disabled}
          style={inputStyle}
          maxLength={8}
        />
        <span style={{ color: '#999', fontSize: '14px', fontWeight: 600 }}>→</span>
        <input
          type="text"
          value={dateTo}
          onChange={(e) => handleToChange(e.target.value)}
          placeholder="结束 例:20260610"
          disabled={disabled}
          style={inputStyle}
          maxLength={8}
        />
      </div>
      <div style={{ marginTop: '6px', display: 'flex', gap: '6px' }}>
        <button
          type="button"
          onClick={() => setQuickRange(7)}
          disabled={disabled}
          style={btnStyle}
        >
          最近 7 天
        </button>
        <button
          type="button"
          onClick={() => setQuickRange(30)}
          disabled={disabled}
          style={btnStyle}
        >
          最近 30 天
        </button>
      </div>
      {error && (
        <div style={{ color: '#c62828', fontSize: '12px', marginTop: '4px' }}>
          ⚠ {error}
        </div>
      )}
    </div>
  );
}

export default DateRangePicker;
