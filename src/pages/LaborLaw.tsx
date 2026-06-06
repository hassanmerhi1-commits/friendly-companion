import { useMemo, useState } from 'react';
import { TopNavLayout } from '@/components/layout/TopNavLayout';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Scale, BookOpen, FileText, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { ATTENDANCE_PAGE } from '@/lib/page-layout';
import {
  laborLawChapters,
  complementaryLegislation,
  searchLaborLaw,
  getLawIndexStats,
  LAW_METADATA,
} from '@/lib/labor-law-data';

const LaborLaw = () => {
  const { language } = useLanguage();
  const pt = language === 'pt';
  const [searchQuery, setSearchQuery] = useState('');
  const [chapterFilter, setChapterFilter] = useState('all');

  const stats = useMemo(() => getLawIndexStats(), []);
  const searchResults = searchQuery.trim() ? searchLaborLaw(searchQuery) : [];

  const visibleChapters = useMemo(() => {
    if (chapterFilter === 'all') return laborLawChapters;
    return laborLawChapters.filter((ch) => ch.id === chapterFilter);
  }, [chapterFilter]);

  const t = {
    title: pt ? 'Lei Geral do Trabalho' : 'General Labor Law',
    subtitle: pt
      ? `Lei n.º ${LAW_METADATA.number} — índice para folha de salário (${stats.indexedArticles} de ${LAW_METADATA.totalArticles} artigos)`
      : `Law No. ${LAW_METADATA.number} — payroll index (${stats.indexedArticles} of ${LAW_METADATA.totalArticles} articles)`,
    searchPlaceholder: pt
      ? 'Pesquisar: férias, horas extra, despedimento, INSS, IRT...'
      : 'Search: vacation, overtime, dismissal, INSS, IRT...',
    article: pt ? 'Artigo' : 'Article',
    chapter: pt ? 'Capítulo' : 'Chapter',
    searchResults: pt ? 'Resultados' : 'Results',
    noResults: pt ? 'Nenhum resultado encontrado' : 'No results found',
    allChapters: pt ? 'Capítulos indexados' : 'Indexed chapters',
    complementary: pt ? 'Legislação complementar (não é LGT)' : 'Complementary legislation (not LGT)',
    clear: pt ? 'Limpar' : 'Clear',
    filterChapter: pt ? 'Capítulo' : 'Chapter',
    all: pt ? 'Todos' : 'All',
    legalNote: pt
      ? `Referência simplificada para uso no PayrollAO. A Lei completa tem ${LAW_METADATA.totalArticles} artigos em ${LAW_METADATA.totalChapters} capítulos (em vigor desde ${LAW_METADATA.effective}). Consulte o Diário da República ou assessoria jurídica para casos específicos.`
      : `Simplified reference for PayrollAO. The full law has ${LAW_METADATA.totalArticles} articles in ${LAW_METADATA.totalChapters} chapters (effective ${LAW_METADATA.effective}). Consult official sources or legal counsel for specific cases.`,
    revokes: pt ? `Revoga ${LAW_METADATA.revokes}` : `Repeals ${LAW_METADATA.revokes}`,
    inLaw: pt ? 'Na lei' : 'In full law',
    indexed: pt ? 'Indexados' : 'Indexed',
    chapters: pt ? 'Capítulos' : 'Chapters',
    complementaryShort: pt ? 'Complementar' : 'Complementary',
  };

  return (
    <TopNavLayout scrollable={false}>
      <div className={`${ATTENDANCE_PAGE} gap-2`}>
        {/* Toolbar */}
        <div className="shrink-0 rounded-xl border border-border/50 bg-card shadow-sm">
          <div className="flex flex-wrap items-center gap-2 px-3 py-2">
            <Scale className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-semibold shrink-0">{t.title}</span>
            <Badge variant="secondary" className="text-[10px] h-5 shrink-0">
              <FileText className="h-3 w-3 mr-1" />
              Lei n.º {LAW_METADATA.number}
            </Badge>
            <span className="text-[10px] text-muted-foreground hidden md:inline shrink-0">
              {t.revokes}
            </span>

            <div className="relative flex-1 min-w-[160px] max-w-[280px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>

            {!searchQuery.trim() && (
              <Select value={chapterFilter} onValueChange={setChapterFilter}>
                <SelectTrigger className="h-8 w-[200px] text-xs shrink-0">
                  <SelectValue placeholder={t.filterChapter} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  {laborLawChapters.map((ch) => (
                    <SelectItem key={ch.id} value={ch.id}>
                      {t.chapter} {ch.number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {(searchQuery.trim() || chapterFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  setSearchQuery('');
                  setChapterFilter('all');
                }}
              >
                {t.clear}
              </Button>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: t.inLaw, value: String(LAW_METADATA.totalArticles), tone: 'text-foreground' },
            { label: t.indexed, value: String(stats.indexedArticles), tone: 'text-primary' },
            { label: t.chapters, value: `${stats.indexedChapters}/${LAW_METADATA.totalChapters}`, tone: 'text-foreground' },
            { label: t.complementaryShort, value: String(stats.complementaryArticles), tone: 'text-muted-foreground' },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-lg border border-border/50 bg-card px-3 py-2 shadow-sm"
            >
              <p className="text-[10px] text-muted-foreground truncate">{kpi.label}</p>
              <p className={cn('text-sm font-semibold tabular-nums', kpi.tone)}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm flex flex-col">
          <div className="shrink-0 px-3 py-2 border-b border-border/40">
            <p className="text-xs text-muted-foreground">{t.subtitle}</p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
            {searchQuery.trim() ? (
              <div>
                <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {t.searchResults} ({searchResults.length})
                </h2>
                {searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((hit, index) => {
                      if (hit.kind === 'lgt') {
                        const { chapter, article } = hit;
                        return (
                          <div
                            key={`lgt-${chapter.id}-${article.number}-${index}`}
                            className="rounded-lg border border-l-4 border-l-primary bg-muted/20 px-3 py-2"
                          >
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-[10px]">
                                {t.article} {article.number}
                              </Badge>
                              <span className="text-sm font-medium">
                                {pt ? article.title : article.titleEn ?? article.title}
                              </span>
                              <Badge variant="secondary" className="text-[10px] ml-auto">
                                {t.chapter} {chapter.number}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {pt ? article.content : article.contentEn ?? article.content}
                            </p>
                          </div>
                        );
                      }
                      const { section, article } = hit;
                      return (
                        <div
                          key={`comp-${section.id}-${article.id}-${index}`}
                          className="rounded-lg border border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-2"
                        >
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[10px] border-amber-500/50">
                              {pt ? section.title : section.titleEn}
                            </Badge>
                            <span className="text-sm font-medium">
                              {pt ? article.title : article.titleEn}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{article.content}</p>
                          <p className="text-[10px] text-muted-foreground/80 mt-1">{article.reference}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">{t.noResults}</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-semibold mb-2">{t.allChapters}</h2>
                  <Accordion type="multiple" className="space-y-2">
                    {visibleChapters.map((chapter) => (
                      <AccordionItem
                        key={chapter.id}
                        value={chapter.id}
                        className="rounded-lg border border-border/50 px-2"
                      >
                        <AccordionTrigger className="py-2 hover:no-underline text-sm">
                          <div className="flex items-center gap-2 text-left">
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              {t.chapter} {chapter.number}
                            </Badge>
                            <span className="font-medium truncate">
                              {pt ? chapter.title : chapter.titleEn}
                            </span>
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {chapter.articles.length} art.
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-3">
                          <div className="space-y-3 pt-1">
                            {chapter.articles.map((article) => (
                              <div
                                key={`${chapter.id}-${article.number}`}
                                className="border-l-2 border-muted pl-3 py-1"
                              >
                                <div className="flex items-center gap-2 mb-0.5">
                                  <Badge variant="outline" className="text-[10px]">
                                    {t.article} {article.number}
                                  </Badge>
                                  <span className="font-medium text-xs">
                                    {pt ? article.title : article.titleEn ?? article.title}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {pt ? article.content : article.contentEn ?? article.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>

                <div>
                  <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    {t.complementary}
                  </h2>
                  <Accordion type="multiple" className="space-y-2">
                    {complementaryLegislation.map((section) => (
                      <AccordionItem
                        key={section.id}
                        value={section.id}
                        className="rounded-lg border border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/10 px-2"
                      >
                        <AccordionTrigger className="py-2 hover:no-underline text-sm">
                          <div className="flex items-center gap-2 text-left">
                            <span className="font-medium">{pt ? section.title : section.titleEn}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {section.articles.length} ref.
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-3">
                          <p className="text-[10px] text-muted-foreground mb-2">{section.reference}</p>
                          <div className="space-y-3">
                            {section.articles.map((article) => (
                              <div key={article.id} className="border-l-2 border-amber-500/40 pl-3 py-1">
                                <span className="font-medium text-xs block mb-0.5">
                                  {pt ? article.title : article.titleEn}
                                </span>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {pt ? article.content : article.contentEn ?? article.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-border/40 px-3 py-2 bg-muted/20">
            <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
              {t.legalNote}
            </p>
          </div>
        </div>
      </div>
    </TopNavLayout>
  );
};

export default LaborLaw;
