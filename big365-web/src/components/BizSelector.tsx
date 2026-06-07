import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listBiz } from '../api/biz';
import type { BizInfo } from '../api/types';

interface BizSelectorProps {
  currentBiz?: string;
}

function BizSelector({ currentBiz }: BizSelectorProps) {
  const [bizList, setBizList] = useState<BizInfo[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    listBiz()
      .then((res) => setBizList(res.data?.items || []))
      .catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const biz = e.target.value;
    if (biz) {
      navigate(`/biz/${biz}/space`);
    }
  };

  if (bizList.length === 0) return null;

  return (
    <select
      value={currentBiz || ''}
      onChange={handleChange}
      style={{
        padding: '6px 12px',
        borderRadius: '6px',
        border: '1px solid #ddd',
        fontSize: '14px',
        background: '#fff',
        minWidth: '160px',
      }}
    >
      <option value="">选择业务</option>
      {bizList.map((biz) => (
        <option key={biz.bizName} value={biz.bizName}>
          {biz.bizLabel} ({biz.bizName})
        </option>
      ))}
    </select>
  );
}

export default BizSelector;
