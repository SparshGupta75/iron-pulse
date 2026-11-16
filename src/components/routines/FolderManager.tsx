import { useState } from 'react';
import { X, Plus, Trash2, Folder } from 'lucide-react';
import type { RoutineFolder } from '../../types';

interface Props {
  folders: RoutineFolder[];
  onSaveFolders: (folders: RoutineFolder[]) => void;
  onClose: () => void;
}

export function FolderManager({ folders, onSaveFolders, onClose }: Props) {
  const [list, setList] = useState<RoutineFolder[]>(folders);
  const [newFolderName, setNewFolderName] = useState('');

  const handleAdd = () => {
    if (!newFolderName.trim()) return;
    const newF: RoutineFolder = {
      id: `folder-${Date.now()}`,
      name: newFolderName.trim(),
    };
    const updated = [...list, newF];
    setList(updated);
    setNewFolderName('');
    onSaveFolders(updated);
  };

  const handleDelete = (id: string) => {
    const updated = list.filter((f) => f.id !== id);
    setList(updated);
    onSaveFolders(updated);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        backgroundColor: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          backgroundColor: '#141416',
          borderRadius: 18,
          border: '1px solid #232327',
          padding: 20,
          color: '#FAFAFA',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Folder size={18} color="#2F8CFF" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Manage Split Folders</h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#232327',
              border: 'none',
              borderRadius: '50%',
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#A1A1AA',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Add new folder */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            type="text"
            placeholder="New folder (e.g. Chest & Back)…"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: '#000000',
              border: '1px solid #232327',
              borderRadius: 8,
              color: '#FAFAFA',
              fontSize: 13,
              outline: 'none',
            }}
          />
          <button
            onClick={handleAdd}
            style={{
              backgroundColor: '#2F8CFF',
              border: 'none',
              borderRadius: 8,
              padding: '8px 14px',
              color: '#FAFAFA',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Plus size={15} /> Add
          </button>
        </div>

        {/* Existing folders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
          {list.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#7C7C87', fontSize: 12, padding: '16px 0' }}>
              No folders created yet.
            </div>
          ) : (
            list.map((f) => (
              <div
                key={f.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#000000',
                  borderRadius: 10,
                  padding: '8px 12px',
                  border: '1px solid #232327',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600 }}>{f.name}</span>
                <button
                  onClick={() => handleDelete(f.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#EF4444',
                    padding: 4,
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            marginTop: 16,
            padding: '10px',
            backgroundColor: '#232327',
            border: 'none',
            borderRadius: 10,
            color: '#FAFAFA',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
