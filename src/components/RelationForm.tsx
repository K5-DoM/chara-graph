import { useState } from 'react';
import { Character, Relation } from '../types';

type Props = {
  characters: Character[];
  existingrelations: Relation[];
  onUpdate: (relations: Relation[]) => void;
};

export default function RelationForm({ characters, existingrelations, onUpdate }: Props) {
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [label, setLabel] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceId || !targetId || sourceId === targetId || !label.trim()) {
      alert("正しく入力してください（キャラが同一・未入力など）");
      return;
    }

    const newRelation: Relation = {
      id: crypto.randomUUID(),
      sourceId,
      targetId,
      label: label.trim(),
    };

    const updated = [...existingrelations, newRelation];
    onUpdate(updated);

    setSourceId('');
    setTargetId('');
    setLabel('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border p-4 rounded shadow-md bg-white">
      <h2 className="text-xl font-semibold">関係性の追加</h2>

      <div>
        <label className="block">キャラクターA（発信）:</label>
        <select value={sourceId} onChange={e => setSourceId(e.target.value)} className="border p-1 w-full">
          <option value="">-- 選択してください --</option>
          {characters.map(char => (
            <option key={char.id} value={char.id}>{char.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block">キャラクターB（受信）:</label>
        <select value={targetId} onChange={e => setTargetId(e.target.value)} className="border p-1 w-full">
          <option value="">-- 選択してください --</option>
          {characters.map(char => (
            <option key={char.id} value={char.id}>{char.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block">関係性ラベル:</label>
        <input
          className="border p-1 w-full"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="例：兄妹、宿敵、師弟 など"
        />
      </div>

      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
        追加
      </button>
    </form>
  );
}
