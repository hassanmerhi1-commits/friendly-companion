import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar, TrendingUp, Users, DollarSign } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const Reports = () => {
  const { t } = useLanguage();

  const reports = [
    { id: "1", name: t.reports.monthlySalaryReport, description: t.reports.monthlySalaryDesc, icon: DollarSign, lastGenerated: "25 Dec 2025", type: "PDF" },
    { id: "2", name: t.reports.employeeReport, description: t.reports.employeeReportDesc, icon: Users, lastGenerated: "24 Dec 2025", type: "Excel" },
    { id: "3", name: t.reports.costAnalysis, description: t.reports.costAnalysisDesc, icon: TrendingUp, lastGenerated: "20 Dec 2025", type: "PDF" },
    { id: "4", name: t.reports.holidayMap, description: t.reports.holidayMapDesc, icon: Calendar, lastGenerated: "15 Dec 2025", type: "Excel" },
  ];

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">{t.reports.title}</h1>
          <p className="text-muted-foreground mt-1">{t.reports.subtitle}</p>
        </div>
        <Button variant="accent">
          <FileText className="h-4 w-4 mr-2" />
          {t.reports.newReport}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report, index) => (
          <div key={report.id} className="stat-card animate-slide-up hover:shadow-lg cursor-pointer group" style={{ animationDelay: `${index * 50}ms` }}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors duration-200">
                  <report.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground group-hover:text-accent transition-colors">{report.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">{t.reports.lastGenerated}: {report.lastGenerated} • {report.type}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 stat-card animate-slide-up" style={{ animationDelay: "200ms" }}>
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">{t.reports.quickStats}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: t.reports.reportsGenerated, value: "24", period: t.reports.thisMonth },
            { label: t.reports.downloads, value: "156", period: t.reports.thisMonth },
            { label: t.reports.avgGeneration, value: "2.3s", period: t.reports.perReport },
            { label: t.reports.availableFormats, value: "3", period: "PDF, Excel, CSV" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-display font-bold text-foreground">{stat.value}</p>
              <p className="text-sm font-medium text-foreground mt-1">{stat.label}</p>
              <p className="text-xs text-muted-foreground">{stat.period}</p>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default Reports;
