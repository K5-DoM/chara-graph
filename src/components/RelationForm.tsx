import { useState } from 'react';
import { Character, Relation } from '../types';
import { confirm } from '@tauri-apps/plugin-dialog';

type Props = {
  characters: Character[];
  existingRelations: Relation[];
  onUpdate: (relations: Relation[]) => void;
};

function moveAt<T>(arr: T[], from: number, to: number): T[] {
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export default function RelationForm({
  characters,
  existingRelations,
  onUpdate,
}: Props) {
  /* ------- local state ------- */
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [label, setLabel] = useState('');
  const [appearAt, setAppearAt] = useState<number | ''>('');
  const [disappearAt, setDisappearAt] = useState<number | ''>('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setSourceId('');
    setTargetId('');
    setLabel('');
    setAppearAt('');
    setDisappearAt('');
  };

  /* ------- submit (add / update) ------- */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // ─ validation ─
    if (!sourceId || !targetId || sourceId === targetId || !label.trim()) {
      alert('入力に不備があります'); return;
    }
    if (appearAt === '') { alert('開始時刻は必須です'); return; }
    if (disappearAt !== '' && +disappearAt <= +appearAt) {
      alert('終了時刻は開始より後にしてください'); return;
    }

    const draft: Relation = {
      id: editingId ?? crypto.randomUUID(),
      sourceId,
      targetId,
      label: label.trim(),
      appearAt: +appearAt,
      disappearAt: disappearAt === '' ? undefined : +disappearAt,
    };

    let updated: Relation[];
    if (editingId) {
      // ------ update ------
      updated = existingRelations.map(r => (r.id === editingId ? draft : r));
    } else {
      // ------ create ------
      updated = [...existingRelations, draft];
    }

    onUpdate(updated);
    resetForm();
  };

  /* ------- edit / delete helpers ------- */
  const handleEditClick = (rel: Relation) => {
    setEditingId(rel.id);
    setSourceId(rel.sourceId);
    setTargetId(rel.targetId);
    setLabel(rel.label);
    setAppearAt(rel.appearAt);
    setDisappearAt(rel.disappearAt ?? '');
  };

  const handleDeleteClick = async (rel: Relation) => {
    const ok = await confirm('この関係性を削除しますか？', {
      title: '関係性削除',
    });
    if (ok) {
      onUpdate(existingRelations.filter(r => r.id !== rel.id));
      if (editingId === rel.id) resetForm();
    }
  };

  /* ------- UI ------- */
  return (
    <>
      {/* form */}
      <form onSubmit={handleSubmit} className="space-y-4 border p-4 rounded bg-white shadow">
        <h2 className="text-xl font-semibold">
          {editingId ? '関係性編集' : '関係性追加'}
        </h2>

        {/* キャラA */}
        <div>
          <label className="block">キャラクターA（発信）</label>
          <select value={sourceId} onChange={e => setSourceId(e.target.value)} className="border p-1 w-full">
            <option value="">-- 選択 --</option>
            {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* キャラB */}
        <div>
          <label className="block">キャラクターB（受信）</label>
          <select value={targetId} onChange={e => setTargetId(e.target.value)} className="border p-1 w-full">
            <option value="">-- 選択 --</option>
            {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* ラベル */}
        <div>
          <label className="block">関係性ラベル</label>
          <input className="border p-1 w-full" value={label} onChange={e => setLabel(e.target.value)} />
        </div>

        {/* 時刻 */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block">開始時刻</label>
            <input
              type="number"
              className="border p-1 w-full"
              value={appearAt}
              onChange={e => setAppearAt(e.target.value === '' ? '' : +e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="block">終了時刻(任意)</label>
            <input
              type="number"
              className="border p-1 w-full"
              value={disappearAt}
              onChange={e => setDisappearAt(e.target.value === '' ? '' : +e.target.value)}
            />
          </div>
        </div>

        {/* ボタン */}
        <div className="flex gap-2">
          <button type="submit" className="btn flex-1 bg-blue-600 text-white">
            {editingId ? '更新' : '追加'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="btn bg-gray-300">
              キャンセル
            </button>
          )}
        </div>
      </form>

      {/* 一覧 */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-2">既存の関係性（Tabで選択・上下キーで移動）</h3>
        <ul className="space-y-2">
          {existingRelations.map((rel,idx) => {
            const ended = rel.disappearAt !== undefined;
            const from = characters.find(c => c.id === rel.sourceId)?.name;
            const to   = characters.find(c => c.id === rel.targetId)?.name;
            return (
              <li key={rel.id}
              id={`char-${rel.id}`} 
              tabIndex={0}
              className={`flex justify-between items-center p-2 rounded
                focus:ring-2 focus:ring-blue-400 cursor-pointer
                ${ended ? 'bg-gray-200 text-gray-500' : 'bg-gray-50'}`}
                onKeyDown={e => {
                  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;

                  e.preventDefault();        // スクロール抑制
                  const dir = e.key === 'ArrowUp' ? -1 : 1;
                  const next = idx + dir;
                  if (next < 0 || next >= existingRelations.length) return;

                  const reordered = moveAt(existingRelations, idx, next);
                  onUpdate(reordered);

                  /* 再レンダリング後に自分にフォーカスを戻す */
                  requestAnimationFrame(() => {
                    document.getElementById(`char-${rel.id}`)?.focus();
                  });
                }}
                >
                <span>
                  {from} → {to} : {rel.label}
                  <span className="text-xs text-gray-500">
                    ({rel.appearAt}〜{rel.disappearAt ?? '…'})
                  </span>
                </span>
                <div className="flex gap-2">
                  <button className="text-blue-500 text-sm" onClick={() => handleEditClick(rel)}>編集</button>
                  <button className="text-red-500 text-sm"  onClick={() => handleDeleteClick(rel)}>削除</button>
                </div>
              </li>
            );
          })}
          {existingRelations.length === 0 && (
            <li className="text-gray-400">関係性がありません</li>
          )}
        </ul>
      </div>
    </>
  );
}
