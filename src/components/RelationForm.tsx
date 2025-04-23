import { useState } from 'react';
import { Character, Relation } from '../types';
import { confirm } from '@tauri-apps/plugin-dialog'

type Props = {
  characters: Character[];
  existingRelations: Relation[];
  onUpdate: (relations: Relation[]) => void;
};

export default function RelationForm({
  characters,
  existingRelations,
  onUpdate
}: Props) {
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [label, setLabel] = useState('');
  const [editingId,setEditingId]= useState<string|null>(null);
  const resetForm = () => {
    setEditingId(null);
    setSourceId('');
    setTargetId('');
    setLabel('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceId || !targetId || sourceId === targetId || !label.trim()) {
      alert("正しく入力してください（キャラが同一・未入力など）");
      return;
    }
    if(editingId){
      //update
      const updated = existingRelations.map(r =>
        r.id === editingId
        ? {...r,sourceId,targetId,label:label.trim()}
        : r
      );
      onUpdate(updated)
    } else {
      //create
      const newRelation: Relation={
        id: crypto.randomUUID(),
        sourceId,
        targetId,
        label: label.trim(),
      };
      onUpdate([...existingRelations,newRelation])
    }
    resetForm();
  };
  const handleEditClick = (rel: Relation)=> {
    setEditingId(rel.id);
    setSourceId(rel.sourceId);
    setTargetId(rel.targetId);
    setLabel(rel.label);
  }
  async function handleDeleteClick (rel: Relation){
    const confirmed = await confirm("この関係性を削除しますか？",{title:'関係性削除の確認'});
    if(confirmed){
      onUpdate(existingRelations.filter(r => r.id !== rel.id));
      if(editingId === rel.id) resetForm();
    }
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-4 border p-4 rounded shadow-md bg-white">
      <h2 className="text-xl font-semibold">{editingId?'関係性編集':'関係性追加'}</h2>

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
      <div className="flex gap-2">
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded flex-1"
        >
          {editingId ? '更新' : '追加'}
        </button>
        {editingId && (
          <button
            type="button"
            onClick={resetForm}
            className="bg-gray-300 text-black px-4 py-2 rounded"
          >
            キャンセル
          </button>
        )}
      </div>
    </form>
      {/* ─── R(一覧)／D(削除) ─── */}
       <div className="border-t pt-4">
         <h3 className="text-lg font-semibold mb-2">既存の関係性</h3>
         <ul className="space-y-2">
           {existingRelations.map(rel => {
            const from = characters.find(c => c.id === rel.sourceId)?.name;
            const to = characters.find(c => c.id === rel.targetId)?.name;
             return (
               <li
                 key={rel.id}
                 className="flex justify-between items-center bg-gray-50 p-2 rounded"
               >
                <span>{from} → {to} : {rel.label}</span>
                 <div className="flex gap-2">
                   <button
                    type="button"
                    className="text-blue-500 text-sm"
                    onClick={() => handleEditClick(rel)}
                   >
                     編集
                   </button>
                   <button
                     type="button"
                     className="text-red-500 text-sm"
                    onClick={() => handleDeleteClick(rel)}
                   >
                     削除
                   </button>
                 </div>
               </li>
             );
           })}
         </ul>
       </div>
    </>
  );
}
