import { readTextFile,writeFile} from '@tauri-apps/plugin-fs';
import { open,save } from '@tauri-apps/plugin-dialog';
export const loadWork = async (): Promise<any | null> => {
    const filePath = await open({
      filters: [{ name: 'JSON File', extensions: ['json'] }],
      multiple: false,
    });
  
    if (typeof filePath === 'string') {
      const contents = await readTextFile(filePath);
      return JSON.parse(contents);
    } else {
      alert("読み込みがキャンセルされました。");
      return null;
    }
  };


export const saveWork = async (work: any) => {
    const encoder = new TextEncoder();
    const json = encoder.encode(JSON.stringify(work, null, 2));
    const filePath = await save({
    filters: [{ name: 'JSON File', extensions: ['json'] }],
    defaultPath: `${work.title || 'work'}.json`,
    });

    if (filePath) {
    await writeFile( filePath, json );
    alert("保存しました！");
    } else {
    alert("保存がキャンセルされました。");
    }
};
