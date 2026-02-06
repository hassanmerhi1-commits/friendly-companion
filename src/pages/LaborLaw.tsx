import { useState } from "react";
import { TopNavLayout } from "@/components/layout/TopNavLayout";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, BookOpen, Scale, FileText } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { laborLawChapters, searchLaborLaw, type LaborLawChapter, type LaborLawArticle } from "@/lib/labor-law-data";

const LaborLaw = () => {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  
  const t = {
    title: language === 'pt' ? 'Lei Geral de Trabalho' : 'General Labor Law',
    subtitle: language === 'pt' ? 'Lei n.º 12/23 de Angola - Pesquise por artigos, capítulos ou termos' : 'Angola Law No. 12/23 - Search by articles, chapters or terms',
    searchPlaceholder: language === 'pt' ? 'Pesquisar artigos, termos, ex: férias, despedimento, horas...' : 'Search articles, terms, e.g.: vacation, dismissal, hours...',
    article: language === 'pt' ? 'Artigo' : 'Article',
    chapter: language === 'pt' ? 'Capítulo' : 'Chapter',
    searchResults: language === 'pt' ? 'Resultados da Pesquisa' : 'Search Results',
    noResults: language === 'pt' ? 'Nenhum resultado encontrado' : 'No results found',
    allChapters: language === 'pt' ? 'Todos os Capítulos' : 'All Chapters',
    lawReference: 'Lei n.º 12/23',
    legalNote: language === 'pt' 
      ? 'Esta é uma referência simplificada. Consulte o texto legal completo para casos específicos.'
      : 'This is a simplified reference. Consult the full legal text for specific cases.',
  };

  const searchResults = searchQuery.trim() ? searchLaborLaw(searchQuery) : [];

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <div className="flex items-center gap-3">
            <Scale className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-display font-bold text-foreground">{t.title}</h1>
          </div>
          <p className="text-muted-foreground mt-1">{t.subtitle}</p>
        </div>
        <Badge variant="secondary" className="text-sm py-1 px-3">
          <FileText className="h-4 w-4 mr-2" />
          {t.lawReference}
        </Badge>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder={t.searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 py-6 text-lg"
        />
      </div>

      {/* Search Results */}
      {searchQuery.trim() && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {t.searchResults} ({searchResults.length})
          </h2>
          {searchResults.length > 0 ? (
            <div className="grid gap-4">
              {searchResults.map(({ chapter, article }, index) => (
                <Card key={`${chapter.id}-${article.number}-${index}`} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Badge variant="outline">{t.article} {article.number}</Badge>
                        {article.title}
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {t.chapter} {chapter.number}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{article.content}</p>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {article.keywords.map(kw => (
                        <Badge key={kw} variant="outline" className="text-xs">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">{t.noResults}</p>
            </Card>
          )}
        </div>
      )}

      {/* All Chapters */}
      {!searchQuery.trim() && (
        <>
          <h2 className="text-lg font-semibold mb-4">{t.allChapters}</h2>
          <Accordion type="multiple" className="space-y-4">
            {laborLawChapters.map((chapter) => (
              <AccordionItem key={chapter.id} value={chapter.id} className="stat-card border-none">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-sm">
                      {t.chapter} {chapter.number}
                    </Badge>
                    <span className="font-medium">
                      {language === 'pt' ? chapter.title : chapter.titleEn}
                    </span>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {chapter.articles.length} {t.article.toLowerCase()}s
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4 pt-2">
                    {chapter.articles.map((article) => (
                      <div key={article.number} className="border-l-2 border-muted pl-4 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {t.article} {article.number}
                          </Badge>
                          <span className="font-medium text-sm">{article.title}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{article.content}</p>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </>
      )}

      {/* Legal Note */}
      <Card className="mt-8 bg-muted/30">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">
            ⚖️ {t.legalNote}
          </p>
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default LaborLaw;
