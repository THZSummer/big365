import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { listDimensions, createDimension, updateDimension, disableDimension } from '../api/dimensions';
import type { DimensionInfo, CreateDimensionRequest, UpdateDimensionRequest } from '../api/types';
import ErrorBanner from '../components/ErrorBanner';
import Loading from '../components/Loading';
import BizSelector from '../components/BizSelector';

function DimensionsPage() {
  const { biz } = useParams<{ biz: string }>();
  const bizName = biz || '';

  const [dimensions, setDimensions] = useState<DimensionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    columnName: '',
    displayName: '',
    description: '',
    leafMin: 1,
    leafMax: 10,
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDim, setEditingDim] = useState<DimensionInfo | null>(null);
  const [editForm, setEditForm] = useState({ displayName: '', description: '', enabled: true });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Disable confirmation
  const [confirmDisable, setConfirmDisable] = useState<number | null>(null);
  const [disabling, setDisabling] = useState<number | null>(null);

  const fetchDimensions = useCallback(() => {
    if (!bizName) return;
    setLoading(true);
    setError(null);
    listDimensions(bizName)
      .then((res) => {
        setDimensions(res.data?.items || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [bizName]);

  useEffect(() => {
    fetchDimensions();
  }, [fetchDimensions]);

  // Create
  const handleCreate = () => {
    setCreateError(null);
    setCreateSubmitting(true);
    const data: CreateDimensionRequest = {
      columnName: createForm.columnName,
      displayName: createForm.displayName,
      description: createForm.description || undefined,
      leafMin: createForm.leafMin,
      leafMax: createForm.leafMax,
    };
    createDimension(bizName, data)
      .then(() => {
        setShowCreateModal(false);
        setCreateForm({ columnName: '', displayName: '', description: '', leafMin: 1, leafMax: 10 });
        showToast('维度创建成功', 'success');
        fetchDimensions();
      })
      .catch((err) => {
        setCreateError(err.message);
        showToast('创建失败: ' + err.message, 'error');
      })
      .finally(() => setCreateSubmitting(false));
  };

  // Edit
  const openEdit = (dim: DimensionInfo) => {
    setEditingDim(dim);
    setEditForm({ displayName: dim.displayName, description: dim.description || '', enabled: dim.enabled });
    setEditError(null);
    setShowEditModal(true);
  };

  const handleEdit = () => {
    if (!editingDim) return;
    setEditError(null);
    setEditSubmitting(true);
    const data: UpdateDimensionRequest = {
      displayName: editForm.displayName,
      description: editForm.description || undefined,
      enabled: editForm.enabled,
    };
    updateDimension(bizName, editingDim.id, data)
      .then(() => {
        setShowEditModal(false);
        setEditingDim(null);
        showToast('维度更新成功', 'success');
        fetchDimensions();
      })
      .catch((err) => {
        setEditError(err.message);
        showToast('更新失败: ' + err.message, 'error');
      })
      .finally(() => setEditSubmitting(false));
  };

  // Disable
  const handleDisable = (id: number) => {
    if (confirmDisable !== id) {
      setConfirmDisable(id);
      return;
    }
    setConfirmDisable(null);
    setDisabling(id);
    disableDimension(bizName, id)
      .then(() => {
        showToast('维度已禁用', 'success');
        fetchDimensions();
      })
      .catch((err) => {
        showToast('禁用失败: ' + err.message, 'error');
      })
      .finally(() => setDisabling(null));
  };

  const tableHeaderStyle: React.CSSProperties = {
    background: '#f5f7fa',
    padding: '10px 12px',
    fontWeight: 600,
    fontSize: '13px',
    color: '#555',
    textAlign: 'left' as const,
    borderBottom: '2px solid #e0e0e0',
  };

  const tableCellStyle: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: '13px',
    borderBottom: '1px solid #f0f0f0',
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2>维度管理</h2>
          <BizSelector currentBiz={bizName} />
        </div>
        <button
          onClick={() => {
            setCreateError(null);
            setCreateForm({ columnName: '', displayName: '', description: '', leafMin: 1, leafMax: 10 });
            setShowCreateModal(true);
          }}
          style={{
            background: '#1a73e8', color: '#fff', border: 'none',
            padding: '10px 20px', borderRadius: '8px', fontWeight: 600,
          }}
        >
          新增维度
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBanner message={error} onRetry={fetchDimensions} />
      ) : dimensions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>
          <p style={{ fontSize: '18px', marginBottom: '12px' }}>暂无维度</p>
          <p>点击「新增维度」开始定义业务维度，或上方选择已注册的业务</p>
        </div>
      ) : (
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid #eee',
          overflow: 'auto',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>列名</th>
                <th style={tableHeaderStyle}>显示名</th>
                <th style={tableHeaderStyle}>取值范围</th>
                <th style={tableHeaderStyle}>状态</th>
                <th style={tableHeaderStyle}>操作</th>
              </tr>
            </thead>
            <tbody>
              {dimensions.map((dim) => (
                <tr key={dim.id} style={{ opacity: dim.enabled ? 1 : 0.5 }}>
                  <td style={tableCellStyle}>
                    <code style={{ background: '#f0f4ff', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
                      {dim.columnName}
                    </code>
                  </td>
                  <td style={tableCellStyle}>{dim.displayName}</td>
                  <td style={tableCellStyle}>
                    {dim.leafMin} ~ {dim.leafMax}
                  </td>
                  <td style={tableCellStyle}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: dim.enabled ? '#e8f5e9' : '#fff3e0',
                      color: dim.enabled ? '#2e7d32' : '#e65100',
                    }}>
                      {dim.enabled ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td style={tableCellStyle}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => openEdit(dim)}
                        style={{
                          background: '#e3f2fd', color: '#1a73e8', border: 'none',
                          padding: '4px 12px', borderRadius: '4px', fontSize: '12px',
                        }}
                      >
                        编辑
                      </button>
                      {dim.enabled && (
                        <button
                          onClick={() => handleDisable(dim.id)}
                          disabled={disabling === dim.id}
                          style={{
                            background: confirmDisable === dim.id ? '#c62828' : '#ffebee',
                            color: confirmDisable === dim.id ? '#fff' : '#c62828',
                            border: 'none', padding: '4px 12px', borderRadius: '4px', fontSize: '12px',
                            opacity: disabling === dim.id ? 0.6 : 1,
                          }}
                        >
                          {disabling === dim.id ? '...' : confirmDisable === dim.id ? '确认禁用' : '禁用'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1000,
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              background: '#fff', borderRadius: '12px', padding: '32px',
              width: '480px', maxHeight: '85vh', overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: '20px' }}>新增维度</h3>
            {createError && <ErrorBanner message={createError} />}

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '13px' }}>
                列名 (columnName)
              </label>
              <input
                value={createForm.columnName}
                onChange={(e) => setCreateForm({ ...createForm, columnName: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
                placeholder="例: a"
              />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '13px' }}>
                显示名 (displayName)
              </label>
              <input
                value={createForm.displayName}
                onChange={(e) => setCreateForm({ ...createForm, displayName: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
                placeholder="例: app"
              />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '13px' }}>
                描述 (description)
              </label>
              <input
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
                placeholder="可选，维度说明"
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '13px' }}>
                  叶子最小值 (leafMin)
                </label>
                <input
                  type="number"
                  value={createForm.leafMin}
                  onChange={(e) => setCreateForm({ ...createForm, leafMin: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
                  min={1}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '13px' }}>
                  叶子最大值 (leafMax)
                </label>
                <input
                  type="number"
                  value={createForm.leafMax}
                  onChange={(e) => setCreateForm({ ...createForm, leafMax: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
                  min={createForm.leafMin}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: '#eee', border: 'none', padding: '10px 20px', borderRadius: '8px' }}
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={createSubmitting || !createForm.columnName || !createForm.displayName}
                style={{
                  background: '#1a73e8', color: '#fff', border: 'none',
                  padding: '10px 24px', borderRadius: '8px', fontWeight: 600,
                  opacity: (createSubmitting || !createForm.columnName || !createForm.displayName) ? 0.6 : 1,
                }}
              >
                {createSubmitting ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingDim && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1000,
          }}
          onClick={() => setShowEditModal(false)}
        >
          <div
            style={{
              background: '#fff', borderRadius: '12px', padding: '32px',
              width: '480px', maxHeight: '85vh', overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: '20px' }}>编辑维度 - {editingDim.columnName}</h3>
            {editError && <ErrorBanner message={editError} />}

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '13px' }}>
                显示名
              </label>
              <input
                value={editForm.displayName}
                onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
              />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '13px' }}>
                描述
              </label>
              <input
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={editForm.enabled}
                  onChange={(e) => setEditForm({ ...editForm, enabled: e.target.checked })}
                />
                启用
              </label>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowEditModal(false)}
                style={{ background: '#eee', border: 'none', padding: '10px 20px', borderRadius: '8px' }}
              >
                取消
              </button>
              <button
                onClick={handleEdit}
                disabled={editSubmitting}
                style={{
                  background: '#1a73e8', color: '#fff', border: 'none',
                  padding: '10px 24px', borderRadius: '8px', fontWeight: 600,
                  opacity: editSubmitting ? 0.6 : 1,
                }}
              >
                {editSubmitting ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

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

export default DimensionsPage;
