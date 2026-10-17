import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Printer, Save, Plus, Trash2, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { printHtml } from '@/lib/print';
import { toast } from 'sonner';
import { liveGetAll, liveInsert } from '@/lib/db-live';
import { formatAOA } from '@/lib/angola-labor-law';
import { normalizeCategoryKey } from '@/lib/employee-categories';
import type { Employee } from '@/types/employee';

export type StaffGroup = 'operarios' | 'adm_servicos' | 'tecnicos' | 'responsaveis';

export type QualifierPost = {
  id: string;
  title: string;
  staffGroup: StaffGroup;
  grupo: string;
  workContent: string;
  requiredKnowledge: string;
  sortOrder: number;
};

export type OccupationalQualifierDoc = {
  version: 1;
  posts: QualifierPost[];
  updatedAt?: string;
};

const STAFF_GROUPS: { id: StaffGroup; labelPt: string; labelEn: string; listTitlePt: string }[] = [
  { id: 'operarios', labelPt: 'Operarios', labelEn: 'Workers', listTitlePt: 'LISTA DE POSTOS DE OPERARIOS' },
  { id: 'adm_servicos', labelPt: 'Adm. Servicos', labelEn: 'Admin / Services', listTitlePt: 'LISTA DE POSTOS DE ADM. SERVICOS' },
  { id: 'tecnicos', labelPt: 'Tecnicos', labelEn: 'Technicians', listTitlePt: 'LISTA DE POSTOS DE TECNICOS' },
  { id: 'responsaveis', labelPt: 'Responsaveis', labelEn: 'Managers', listTitlePt: 'LISTA DE POSTOS DE RESPONSAVEIS' },
];

const GRUPO_OPTIONS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const SETTINGS_KEY = 'occupationalQualifier';

function uid() {
  return 'q-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}

function emptyPost(title = '', sortOrder = 0): QualifierPost {
  return {
    id: uid(),
    title,
    staffGroup: 'adm_servicos',
    grupo: 'I',
    workContent: '',
    requiredKnowledge: '',
    sortOrder,
  };
}

async function loadDoc(): Promise<OccupationalQualifierDoc> {
  try {
    const rows = await liveGetAll<{ key: string; value: string }>('settings');
    const row = rows.find((r) => r.key === SETTINGS_KEY);
    if (!row?.value) return { version: 1, posts: [] };
    const parsed = JSON.parse(row.value);
    if (!parsed || !Array.isArray(parsed.posts)) return { version: 1, posts: [] };
    return { version: 1, posts: parsed.posts, updatedAt: parsed.updatedAt };
  } catch {
    return { version: 1, posts: [] };
  }
}

async function saveDoc(doc: OccupationalQualifierDoc) {
  const payload = { ...doc, version: 1 as const, updatedAt: new Date().toISOString() };
  await liveInsert('settings', {
    key: SETTINGS_KEY,
    value: JSON.stringify(payload),
    updated_at: payload.updatedAt,
  });
  return payload;
}

function escapeHtml(s: string) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface Props {
  employees: Employee[];
  categories: string[];
  companyName?: string;
  companyNif?: string;
  province?: string;
  onClose?: () => void;
}

export function PrintableOccupationalQualifier({
  employees,
  categories,
  companyName = 'DISTRI-GOOD, LDA',
  companyNif = '',
  province = '',
  onClose,
}: Props) {
  const { language } = useLanguage();
  const pt = language === 'pt';
  const [posts, setPosts] = useState<QualifierPost[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const salaryByCategory = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const e of employees.filter((x) => x.status === 'active')) {
      const cat = e.category || e.position || '';
      if (!cat) continue;
      const key = normalizeCategoryKey(cat);
      const arr = map.get(key) || [];
      arr.push(Number(e.baseSalary) || 0);
      map.set(key, arr);
    }
    const out = new Map<string, { min: number; max: number; avg: number; count: number }>();
    for (const [k, vals] of map) {
      const positive = vals.filter((v) => v > 0);
      if (positive.length === 0) continue;
      const min = Math.min(...positive);
      const max = Math.max(...positive);
      const avg = positive.reduce((a, b) => a + b, 0) / positive.length;
      out.set(k, { min, max, avg, count: positive.length });
    }
    return out;
  }, [employees]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const doc = await loadDoc();
      if (cancelled) return;
      if (doc.posts.length === 0 && categories.length > 0) {
        const seeded = categories.map((c, i) => emptyPost(c, i));
        setPosts(seeded);
        setSelectedId(seeded[0]?.id || null);
      } else {
        setPosts(doc.posts);
        setSelectedId(doc.posts[0]?.id || null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories.join('|')]);

  const selected = posts.find((p) => p.id === selectedId) || null;

  const updateSelected = (patch: Partial<QualifierPost>) => {
    if (!selectedId) return;
    setPosts((prev) => prev.map((p) => (p.id === selectedId ? { ...p, ...patch } : p)));
  };

  const handleSeedFromCategories = () => {
    const existingKeys = new Set(posts.map((p) => normalizeCategoryKey(p.title)));
    const additions = categories
      .filter((c) => !existingKeys.has(normalizeCategoryKey(c)))
      .map((c, i) => emptyPost(c, posts.length + i));
    if (additions.length === 0) {
      toast.message(pt ? 'Nenhuma categoria nova para adicionar' : 'No new categories to add');
      return;
    }
    const next = [...posts, ...additions];
    setPosts(next);
    if (!selectedId) setSelectedId(additions[0].id);
    toast.success(pt ? 'Adicionadas ' + additions.length + ' funcoes' : 'Added ' + additions.length + ' functions');
  };

  const handleAdd = () => {
    const p = emptyPost(pt ? 'Nova funcao' : 'New function', posts.length);
    setPosts((prev) => [...prev, p]);
    setSelectedId(p.id);
  };

  const handleDelete = () => {
    if (!selectedId) return;
    const next = posts.filter((p) => p.id !== selectedId);
    setPosts(next);
    setSelectedId(next[0]?.id || null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveDoc({ version: 1, posts });
      toast.success(pt ? 'Qualificador guardado' : 'Qualifier saved');
    } catch (e: any) {
      toast.error(e?.message || (pt ? 'Erro ao guardar' : 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async () => {
    if (posts.length === 0) {
      toast.error(pt ? 'Adicione pelo menos uma funcao' : 'Add at least one function');
      return;
    }
    const ordered = [...posts].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, 'pt'));
    const company = escapeHtml(companyName);
    const prov = escapeHtml(province || '');
    const nif = escapeHtml(companyNif || '');

    const indexRows = ordered
      .map((p, i) => '<tr><td>' + escapeHtml(p.title.toUpperCase()) + '</td><td style="text-align:right">' + (i + 1) + '</td></tr>')
      .join('');

    const listBlocks = STAFF_GROUPS.map((g) => {
      const groupPosts = ordered.filter((p) => p.staffGroup === g.id);
      if (groupPosts.length === 0) return '';
      const byGrupo = new Map<string, QualifierPost[]>();
      for (const p of groupPosts) {
        const arr = byGrupo.get(p.grupo) || [];
        arr.push(p);
        byGrupo.set(p.grupo, arr);
      }
      const gruposHtml = [...byGrupo.entries()]
        .sort((a, b) => GRUPO_OPTIONS.indexOf(a[0]) - GRUPO_OPTIONS.indexOf(b[0]))
        .map(([grupo, list]) => {
          const items = list.map((p) => '<div class="job">' + escapeHtml(p.title.toUpperCase()) + '</div>').join('');
          return '<div class="grupo"><div class="grupo-title">GRUPO ' + escapeHtml(grupo) + '</div>' + items + '</div>';
        })
        .join('');
      return '<div class="page"><h2>' + g.listTitlePt + '</h2>' + gruposHtml + '</div>';
    }).join('');

    const detailPages = ordered
      .map((p, i) => {
        return (
          '<div class="page detail">' +
          '<div class="detail-head">' +
          '<div class="fn">' + escapeHtml(p.title.toUpperCase()) + '</div>' +
          '<div class="gr">GRUPO ' + escapeHtml(p.grupo) + '</div>' +
          '</div>' +
          '<h3>DESCRICAO DO CONTEUDO DE TRABALHO</h3>' +
          '<p>' + (escapeHtml(p.workContent) || '________________') + '</p>' +
          '<h3>CONHECIMENTOS EXIGIDOS</h3>' +
          '<p>' + (escapeHtml(p.requiredKnowledge) || '________________') + '</p>' +
          '<div class="pgnum">' + (i + 1) + '</div>' +
          '</div>'
        );
      })
      .join('');

    const html =
      '<!DOCTYPE html><html><head><meta charset="utf-8"/>' +
      '<title>Qualificador Ocupacional - ' + company + '</title>' +
      '<style>' +
      '* { box-sizing: border-box; }' +
      'body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 0; font-size: 12px; }' +
      '.page { page-break-after: always; padding: 28px 36px; min-height: 90vh; }' +
      '.cover { display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; min-height: 90vh; }' +
      '.cover h1 { font-size: 28px; letter-spacing: 2px; margin: 6px 0; text-transform: uppercase; }' +
      '.cover .sub { font-size: 16px; margin-top: 18px; }' +
      '.cover .meta { margin-top: 40px; font-size: 12px; color: #444; }' +
      'h2 { text-decoration: underline; font-size: 14px; margin-bottom: 16px; }' +
      'h3 { text-decoration: underline; font-size: 12px; margin: 18px 0 8px; }' +
      'table.index { width: 100%; border-collapse: collapse; }' +
      'table.index td { padding: 6px 4px; border-bottom: 1px dotted #999; }' +
      '.grupo { margin-bottom: 14px; }' +
      '.grupo-title { font-weight: 700; text-decoration: underline; margin: 10px 0 4px; }' +
      '.job { margin-left: 8px; padding: 2px 0; }' +
      '.detail-head { display:flex; justify-content:space-between; gap: 16px; margin-bottom: 20px; }' +
      '.detail-head .fn, .detail-head .gr { font-weight: 700; text-decoration: underline; text-transform: uppercase; }' +
      '.detail p { line-height: 1.45; white-space: pre-wrap; }' +
      '.pgnum { margin-top: 40px; text-align: center; }' +
      '@media print { @page { margin: 14mm; } }' +
      '</style></head><body>' +
      '<div class="page cover">' +
      '<h1>QUALIFICADOR</h1><h1>OCUPACIONAL</h1><h1>DA</h1>' +
      '<h1>' + company + '</h1>' +
      '<div class="sub">' + (prov ? prov.toUpperCase() : '') + '</div>' +
      '<div class="meta">' + (nif ? 'NIF: ' + nif + '<br/>' : '') + new Date().toLocaleDateString('pt-AO') + '</div>' +
      '</div>' +
      '<div class="page"><h2>INDICE</h2><table class="index">' + indexRows + '</table></div>' +
      listBlocks +
      detailPages +
      '</body></html>';

    await printHtml(html, { width: 900, height: 1200 });
  };

  const salaryHint = selected ? salaryByCategory.get(normalizeCategoryKey(selected.title)) : undefined;

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">{pt ? 'A carregar...' : 'Loading...'}</div>;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
        {pt
          ? 'Preencha cada funcao (grupo, descricao, conhecimentos). Guarde e imprima o PDF para a IGT. Dados ficam nesta provincia/BD.'
          : 'Fill each function (group, description, knowledge). Save and print PDF for IGT. Data stays in this province/DB.'}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSave} disabled={saving} variant="accent">
          <Save className="h-4 w-4 mr-2" />
          {pt ? 'Guardar' : 'Save'}
        </Button>
        <Button onClick={handlePrint} variant="outline">
          <Printer className="h-4 w-4 mr-2" />
          {pt ? 'Imprimir / PDF' : 'Print / PDF'}
        </Button>
        <Button onClick={handleSeedFromCategories} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          {pt ? 'Importar categorias' : 'Import categories'}
        </Button>
        <Button onClick={handleAdd} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          {pt ? 'Nova funcao' : 'New function'}
        </Button>
        {selected && (
          <Button onClick={handleDelete} variant="outline" className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            {pt ? 'Eliminar' : 'Delete'}
          </Button>
        )}
        {onClose && (
          <Button onClick={onClose} variant="ghost">
            {pt ? 'Fechar' : 'Close'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-3 min-h-[420px]">
        <div className="rounded border overflow-auto max-h-[60vh]">
          {posts.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground">
              {pt ? 'Sem funcoes. Importe categorias ou adicione.' : 'No functions. Import categories or add.'}
            </div>
          ) : (
            posts.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={'w-full text-left px-3 py-2 text-xs border-b hover:bg-muted/50 ' + (p.id === selectedId ? 'bg-primary/10 font-semibold' : '')}
              >
                <div className="truncate">{p.title || '—'}</div>
                <div className="text-[10px] text-muted-foreground">
                  {STAFF_GROUPS.find((g) => g.id === p.staffGroup)?.[pt ? 'labelPt' : 'labelEn']} · GRUPO {p.grupo}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="rounded border p-3 space-y-3">
          {!selected ? (
            <div className="text-sm text-muted-foreground">{pt ? 'Seleccione uma funcao' : 'Select a function'}</div>
          ) : (
            <>
              <div>
                <Label className="text-xs">{pt ? 'Funcao / Posto' : 'Function / Post'}</Label>
                <Input className="mt-1" value={selected.title} onChange={(e) => updateSelected({ title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{pt ? 'Grupo de pessoal' : 'Staff group'}</Label>
                  <select
                    className="mt-1 w-full border rounded px-2 py-2 text-sm bg-background"
                    value={selected.staffGroup}
                    onChange={(e) => updateSelected({ staffGroup: e.target.value as StaffGroup })}
                  >
                    {STAFF_GROUPS.map((g) => (
                      <option key={g.id} value={g.id}>{pt ? g.labelPt : g.labelEn}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Grupo (I-VIII)</Label>
                  <select
                    className="mt-1 w-full border rounded px-2 py-2 text-sm bg-background"
                    value={selected.grupo}
                    onChange={(e) => updateSelected({ grupo: e.target.value })}
                  >
                    {GRUPO_OPTIONS.map((g) => (
                      <option key={g} value={g}>GRUPO {g}</option>
                    ))}
                  </select>
                </div>
              </div>
              {salaryHint && (
                <div className="text-[11px] rounded bg-muted/40 px-2 py-1.5 text-muted-foreground">
                  {pt ? 'Salarios base (activos nesta categoria)' : 'Base salaries (active in this category)'}:{' '}
                  min {formatAOA(salaryHint.min)} · med {formatAOA(salaryHint.avg)} · max {formatAOA(salaryHint.max)}{' '}
                  ({salaryHint.count})
                </div>
              )}
              <div>
                <Label className="text-xs">{pt ? 'Descricao do conteudo de trabalho' : 'Job content description'}</Label>
                <Textarea
                  className="mt-1 min-h-[120px]"
                  value={selected.workContent}
                  onChange={(e) => updateSelected({ workContent: e.target.value })}
                  placeholder={pt ? 'O que faz nesta funcao...' : 'What this role does...'}
                />
              </div>
              <div>
                <Label className="text-xs">{pt ? 'Conhecimentos exigidos' : 'Required knowledge'}</Label>
                <Textarea
                  className="mt-1 min-h-[100px]"
                  value={selected.requiredKnowledge}
                  onChange={(e) => updateSelected({ requiredKnowledge: e.target.value })}
                  placeholder={pt ? 'Habilitacoes, cartas, experiencia...' : 'Education, licenses, experience...'}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
