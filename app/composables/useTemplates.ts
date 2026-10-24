/**
 * 模板管理（服务端版，Phase 2）
 *
 * 模板存服务端 KV（GET/POST/DELETE/PATCH /api/templates），Free 上限 3 个。
 * 匿名期遗留的 localStorage 模板在首次登录成功后一次性迁移（migrateLocalTemplates）。
 */
import type { MappingTable, CleanRule } from '../../shared/core/index';

export const TEMPLATES_KEY = 'cleansheet_templates'; // 仅用于迁移读取，迁移后清除
export const TEMPLATE_CAP_FREE = 3;

export interface SavedTemplate {
  id: string;
  name: string;
  presetId: string | null;
  presetName: string | null;
  mapping: MappingTable;
  rules: CleanRule[];
  createdAt: string;
}

interface ServerTemplate {
  id: string;
  name: string;
  platform: string | null;
  platformName: string | null;
  mapping: MappingTable;
  rules: CleanRule[];
  createdAt: string;
}

function toSaved(t: ServerTemplate): SavedTemplate {
  return {
    id: t.id,
    name: t.name,
    presetId: t.platform,
    presetName: t.platformName,
    mapping: t.mapping,
    rules: t.rules,
    createdAt: t.createdAt
  };
}

function readLocalLegacy(): Omit<SavedTemplate, 'id' | 'createdAt'>[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(TEMPLATES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as SavedTemplate[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function useTemplates() {
  const list = useState<SavedTemplate[]>('cleansheet-templates', () => []);
  const loaded = useState<boolean>('cleansheet-templates-loaded', () => false);

  async function fetchTemplates() {
    const data = await $fetch<ServerTemplate[]>('/api/templates');
    list.value = data.map(toSaved);
    loaded.value = true;
  }

  /** 保存模板；超限返回 'capped'（由调用方弹出 PaywallCard） */
  async function saveTemplate(
    t: Omit<SavedTemplate, 'id' | 'createdAt'>
  ): Promise<'ok' | 'capped'> {
    try {
      const created = await $fetch<ServerTemplate>('/api/templates', {
        method: 'POST',
        body: {
          name: t.name,
          platform: t.presetId,
          platformName: t.presetName,
          mapping: t.mapping,
          rules: t.rules
        }
      });
      list.value = [toSaved(created), ...list.value];
      return 'ok';
    } catch (e: any) {
      if (e?.data?.error === 'template_cap') return 'capped';
      throw e;
    }
  }

  async function renameTemplate(id: string, name: string) {
    const updated = await $fetch<ServerTemplate>(`/api/templates/${id}`, {
      method: 'PATCH',
      body: { name }
    });
    list.value = list.value.map((t) => (t.id === id ? toSaved(updated) : t));
  }

  async function deleteTemplate(id: string) {
    await $fetch(`/api/templates/${id}`, { method: 'DELETE' });
    list.value = list.value.filter((t) => t.id !== id);
  }

  function getTemplate(id: string): SavedTemplate | undefined {
    return list.value.find((t) => t.id === id);
  }

  /**
   * 一次性迁移：把匿名期 localStorage 模板导入服务端（最多取 3 个），
   * 成功后清除本地副本并打标，避免重复迁移。
   */
  async function migrateLocalTemplates() {
    try {
      if (typeof localStorage === 'undefined') return;
      if (localStorage.getItem('cleansheet_tpl_migrated') === '1') return;
      const legacy = readLocalLegacy().slice(0, TEMPLATE_CAP_FREE);
      for (const t of legacy) {
        try {
          await saveTemplate(t);
        } catch {
          break; // 超限或网络失败：停止，后续手动处理
        }
      }
      localStorage.removeItem(TEMPLATES_KEY);
      localStorage.setItem('cleansheet_tpl_migrated', '1');
      await fetchTemplates();
    } catch {
      /* 迁移失败不阻断登录 */
    }
  }

  return {
    list,
    loaded,
    fetchTemplates,
    saveTemplate,
    renameTemplate,
    deleteTemplate,
    getTemplate,
    migrateLocalTemplates,
    cap: TEMPLATE_CAP_FREE
  };
}
