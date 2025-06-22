import { useState } from 'react';
import { Character, Relation, RelationEvent } from '../types';
import { confirm } from '@tauri-apps/plugin-dialog';

type Props = {
  characters: Character[];
  existingRelations: Relation[];
  onUpdate: (relations: Relation[]) => void;
};

export default function RelationForm({
  characters,
  existingRelations,
  onUpdate,
}: Props) {
  /* ─── state ─── */
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [label, setLabel] = useState('');
  const [startTime, setStartTime] = useState<number | ''>('');
  const [endTime, setEndTime] = useState<number | ''>('');
  const [editingId, setEditingId] = useState<string | null>(null);

  /* ─── 共通リセット ─── */
  const resetForm = () => {
    setEditingId(null);
    setSourceId('');
    setTargetId('');
    setLabel('');
    setStartTime('');
    setEndTime('');
  };

  /* ─── 送信 ─── */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceId || !targetId || sourceId === targetId || !label.trim()) {
      alert('正しく入力してください');
      return;
    }
    if (startTime === '') {
      alert('開始時刻を入力してください');
      return;
    }
    if (endTime !== '' && Number(endTime) <= Number(startTime)) {
      alert('終了時刻は開始より後にしてください');
      return;
    }

    if (editingId) {
      /* --------- 更新 --------- */
      const updated = existingRelations.map((r) =>
        r.id === editingId
          ? {
              ...r,
              label: label.trim(),
              timeline: [
                ...r.timeline!,
                {
                  time: Number(startTime),
                  type: 'update',
                  label: label.trim(),
                } as RelationEvent,
              ],
            }
          : r
      );
      onUpdate(updated);
    } else {
      /* --------- 新規 --------- */
      const timeline: RelationEvent[] = [
        { time: Number(startTime), type: 'create', label: label.trim() },
      ];
      if (endTime !== '')
        timeline.push({ time: Number(endTime), type: 'remove', label: '' });

      const newRel: Relation = {
        id: crypto.randomUUID(),
        sourceId,
        targetId,
        label: label.trim(),
        timeline,
      };
      onUpdate([...existingRelations, newRel]);
    }
    resetForm();
  };

  /* ─── 編集 & 削除 ─── */
  const handleEditClick = (rel: Relation) => {
    setEditingId(rel.id);
    setSourceId(rel.sourceId);
    setTargetId(rel.targetId);
    setLabel(rel.label);
    const createEvt = rel.timeline?.find((ev) => ev.type === 'create');
    const removeEvt = rel.timeline?.find((ev) => ev.type === 'remove');
    setStartTime(createEvt ? createEvt.time : '');
    setEndTime(removeEvt ? removeEvt.time : '');
  };

  const handleDeleteClick = async (rel: Relation) => {
    const ok = await confirm('この関係性を削除しますか？', {
      title: '関係性削除',
    });
    if (ok) {
      onUpdate(existingRelations.filter((r) => r.id !== rel.id));
      if (editingId === rel.id) resetForm();
    }
  };

  /* ─── UI ─── */
  return (
    <>
      {/* 追加 / 編集フォーム */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 border p-4 rounded shadow-md bg-white"
      >
        <h2 className="text-xl font-semibold">
          {editingId ? '関係性編集' : '関係性追加'}
        </h2>

        {/* キャラ選択 */}
        <div>
          <label className="block">キャラクターA（発信）:</label>
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className="border p-1 w-full"
          >
            <option value="">-- 選択 --</option>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block">キャラクターB（受信）:</label>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="border p-1 w-full"
          >
            <option value="">-- 選択 --</option>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* ラベル & 時刻 */}
        <div>
          <label className="block">関係性ラベル:</label>
          <input
            className="border p-1 w-full"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block">開始時刻:</label>
            <input
              type="number"
              className="border p-1 w-full"
              value={startTime}
              onChange={(e) =>
                setStartTime(e.target.value === '' ? '' : Number(e.target.value))
              }
            />
          </div>
          <div className="flex-1">
            <label className="block">終了時刻(任意):</label>
            <input
              type="number"
              className="border p-1 w-full"
              value={endTime}
              onChange={(e) =>
                setEndTime(e.target.value === '' ? '' : Number(e.target.value))
              }
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

      {/* 一覧 + 編集 / 削除 */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-2">既存の関係性</h3>
        <ul className="space-y-2">
          {existingRelations.map((rel) => {
            const from = characters.find((c) => c.id === rel.sourceId)?.name;
            const to = characters.find((c) => c.id === rel.targetId)?.name;
            const createEvt = rel.timeline?.find((ev) => ev.type === 'create');
            const removeEvt = rel.timeline?.find((ev) => ev.type === 'remove');
            const ended = !!removeEvt;
            return (
              <li
                key={rel.id}
                className={`flex justify-between items-center p-2 rounded ${
                  ended ? 'bg-gray-200 text-gray-500' : 'bg-gray-50'
                }`}
              >
                <span>
                  {from} → {to} : {rel.label}{' '}
                  <span className="text-xs text-gray-400">
                    ({createEvt?.time}〜{removeEvt?.time ?? '…'})
                  </span>
                </span>
                <div className="flex gap-2">
                  <button
                    className="text-blue-500 text-sm"
                    onClick={() => handleEditClick(rel)}
                  >
                    編集
                  </button>
                  <button
                    className="text-red-500 text-sm"
                    onClick={() => handleDeleteClick(rel)}
                  >
                    削除
                  </button>
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
