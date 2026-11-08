import { useEffect, useState } from 'react';

import { adminApi } from '@/features/admin/utils/admin-api';
import type { CharacterTemplate } from '@/features/postcards/types/postcard';
import { confirmDelete } from '@/lib/confirm';

export function useTemplatesScreen() {
  const [templates, setTemplates] = useState<CharacterTemplate[] | null>(null);
  const [style, setStyle] = useState('');
  const [count, setCount] = useState('5');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [costs, setCosts] = useState<Record<string, string>>({});

  const load = async () => {
    try {
      const r = await adminApi.templates();
      setTemplates(r.templates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t load templates.');
      setTemplates((t) => t ?? []);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const pending = (templates ?? []).some((t) => t.status === 'queued' || t.status === 'running');
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => void load(), 5000);
    return () => clearInterval(t);
  }, [pending]);

  const run = async (key: string, work: () => Promise<string | null>) => {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      setNotice(await work());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  };

  const generate = () =>
    run('generate', async () => {
      if (!style.trim()) throw new Error('Please enter a style description');
      const n = Math.max(1, Math.min(10, Number(count) || 5));
      const r = await adminApi.generateTemplates(style.trim(), n);
      await load();
      return `Generating ${r.templates.length} character templates...`;
    });

  const update = (t: CharacterTemplate, body: Parameters<typeof adminApi.updateTemplate>[1]) =>
    run(t.id, async () => {
      const { template } = await adminApi.updateTemplate(t.id, body);
      setTemplates((list) => (list ?? []).map((x) => (x.id === t.id ? template : x)));
      return null;
    });

  const saveCost = (t: CharacterTemplate) => {
    const n = Number(costs[t.id] ?? t.stamp_cost);
    if (!Number.isFinite(n) || n < 0) return setError('Enter a stamp cost of 0 or more.');
    void update(t, { stamp_cost: Math.round(n) });
  };

  const askDelete = (t: CharacterTemplate) =>
    confirmDelete({
      title: `Delete ${t.name}?`,
      message: 'Players can no longer create this Flikkstar.',
      confirmLabel: 'Delete template',
      onConfirm: () =>
        void run(t.id, async () => {
          await adminApi.removeTemplate(t.id);
          setTemplates((list) => (list ?? []).filter((x) => x.id !== t.id));
          return 'Template deleted';
        }),
    });

  return { templates, style, setStyle, count, setCount, busy, error, notice, generate, update, costs, setCosts, saveCost, askDelete, load };
}
