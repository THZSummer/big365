import type { DimensionInfo } from '../api/types';

interface CoordinateInputProps {
  dimensions: DimensionInfo[];
  values: Record<string, number>;
  onChange: (values: Record<string, number>) => void;
  allowZero?: boolean;
  disabled?: boolean;
}

function CoordinateInput({ dimensions, values, onChange, allowZero = true, disabled = false }: CoordinateInputProps) {
  const handleChange = (columnName: string, val: number) => {
    onChange({ ...values, [columnName]: val });
  };

  const labelStyle: React.CSSProperties = {
    fontWeight: 600,
    fontSize: '13px',
    color: '#555',
    minWidth: '80px',
    lineHeight: '32px',
  };

  const selectStyle: React.CSSProperties = {
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '13px',
    background: disabled ? '#f5f5f5' : '#fff',
    minWidth: '100px',
    color: '#333',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {dimensions.map((dim) => {
        const val = values[dim.columnName] ?? 0;
        const start = allowZero ? 0 : 1;
        const end = dim.leafMax;
        const options: { value: number; label: string }[] = [];
        for (let i = start; i <= end; i++) {
          options.push({
            value: i,
            label: i === 0 ? `0 (ALL - ${dim.displayName})` : String(i),
          });
        }
        if (!allowZero && end < start) {
          // edge case: no valid values when leafMax < 1 and allowZero is false
          return (
            <div key={dim.columnName} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={labelStyle}>{dim.displayName}</span>
              <span style={{ fontSize: '13px', color: '#999' }}>无可用值</span>
            </div>
          );
        }

        return (
          <div key={dim.columnName} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={labelStyle}>{dim.displayName}</span>
            <select
              value={val}
              onChange={(e) => handleChange(dim.columnName, Number(e.target.value))}
              disabled={disabled}
              style={selectStyle}
            >
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}

export default CoordinateInput;
