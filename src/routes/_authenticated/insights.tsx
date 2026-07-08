import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { indicadoresQuery, motivosQuery } from "@/lib/queries";
import { enrich, uniquePeriods } from "@/lib/analytics";
import { MONTH_NAMES_ES, periodKey } from "@/lib/periods";
import {
  Award, Sparkles, TrendingDown, TrendingUp, Trophy, Loader2, Wand2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/insights")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(motivosQuery());
    context.queryClient.ensureQueryData(indicadoresQuery());
  },
  component: InsightsPage,
});

function InsightsPage() {
  const { data: motivos } = useSuspenseQuery(motivosQuery());
  const { data: indicadores } = useSuspenseQuery(indicadoresQuery());

  const enriched = useMemo(() => enrich(indicadores, motivos), [indicadores, motivos]);
  const periods = useMemo(() => uniquePeriods(indicadores), [indicadores]);
  const latest = periods[periods.length - 1];
  const previous = periods[periods.length - 2];
  const okId = motivos.find((m) => m.nombre.toLowerCase() === "ok")?.id;

  const summary = useMemo(() => {
    if (!latest) return null;
    // avg per motivo (delay causes)
    const causes = motivos.filter((m) => m.id !== okId);
    const stats = causes.map((m) => {
      const values = enriched.filter((r) => r.motivo_id === m.id).map((r) => r.porcentaje);
      const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      const cur = enriched.find((r) => r.motivo_id === m.id && r.anio === latest.anio && r.mes === latest.mes)?.porcentaje ?? 0;
      const prev = previous ? enriched.find((r) => r.motivo_id === m.id && r.anio === previous.anio && r.mes === previous.mes)?.porcentaje ?? 0 : 0;
      // trend over last 3 months
      const last3 = periods.slice(-3);
      const last3vals = last3
        .map((p) => enriched.find((r) => r.motivo_id === m.id && r.anio === p.anio && r.mes === p.mes)?.porcentaje ?? 0);
      const slope = last3vals.length > 1 ? (last3vals[last3vals.length - 1] - last3vals[0]) / (last3vals.length - 1) : 0;
      return { motivo: m, avg, cur, prev, delta: cur - prev, slope };
    });

    const principal = [...stats].sort((a, b) => b.cur - a.cur)[0];
    const growing = [...stats].sort((a, b) => b.delta - a.delta)[0];
    const decreasing = [...stats].sort((a, b) => a.delta - b.delta)[0];
    const ranking = [...stats].sort((a, b) => b.avg - a.avg);

    const okCurrent = okId ? enriched.find((r) => r.motivo_id === okId && r.anio === latest.anio && r.mes === latest.mes)?.porcentaje ?? null : null;
    const okPrev = okId && previous ? enriched.find((r) => r.motivo_id === okId && r.anio === previous.anio && r.mes === previous.mes)?.porcentaje ?? null : null;

    // Text bullets
    const bullets: string[] = [];
    if (principal) bullets.push(`El principal motivo de retraso este mes es "${principal.motivo.nombre}" con ${principal.cur.toFixed(0)}%.`);
    if (growing && growing.delta > 0.5) bullets.push(`"${growing.motivo.nombre}" muestra el mayor crecimiento (+${growing.delta.toFixed(1)}pp vs. mes anterior).`);
    if (decreasing && decreasing.delta < -0.5) bullets.push(`"${decreasing.motivo.nombre}" tuvo la mayor disminución (${decreasing.delta.toFixed(1)}pp vs. mes anterior).`);
    if (okCurrent != null && okPrev != null) {
      const d = okCurrent - okPrev;
      bullets.push(`El cumplimiento (OK) ${d >= 0 ? "subió" : "bajó"} ${Math.abs(d).toFixed(1)}pp respecto al mes anterior (${okCurrent.toFixed(0)}%).`);
    }
    for (const s of stats) {
      if (Math.abs(s.slope) < 0.3) continue;
      if (s.slope > 2) bullets.push(`"${s.motivo.nombre}" presenta una tendencia creciente durante los últimos meses.`);
      if (s.slope < -2) bullets.push(`"${s.motivo.nombre}" viene disminuyendo de forma sostenida.`);
    }

    return { principal, growing, decreasing, ranking, okCurrent, okPrev, bullets };
  }, [enriched, motivos, latest, previous, periods, okId]);

  const [aiText, setAiText] = useState<string>("");
  const aiMutation = useMutation({
    mutationFn: async () => {
      const prompt = buildAiPrompt(enriched, motivos, periods.slice(-6));
      const { data, error } = await supabase.functions.invoke("insights-ai", {
        body: { prompt },
      });
      if (error) throw error;
      return (data as { text: string }).text;
    },
    onSuccess: (t) => { setAiText(t); toast.success("Análisis generado"); },
    onError: () => toast.error("No se pudo generar el análisis"),
  });

  if (!summary) return <EmptyInsights />;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-primary">Analítica</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Insights Inteligentes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Análisis automático de tus indicadores. Último periodo: {latest ? `${MONTH_NAMES_ES[latest.mes - 1]} ${latest.anio}` : "—"}.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Principal motivo"
          value={summary.principal?.motivo.nombre ?? "—"}
          hint={summary.principal ? `${summary.principal.cur.toFixed(0)}% en el último mes` : ""}
          icon={<Trophy className="h-5 w-5" />}
          accent={summary.principal?.motivo.color}
        />
        <MetricCard
          title="Mayor crecimiento"
          value={summary.growing?.motivo.nombre ?? "—"}
          hint={summary.growing ? `+${summary.growing.delta.toFixed(1)}pp vs mes anterior` : ""}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="var(--destructive)"
        />
        <MetricCard
          title="Mayor disminución"
          value={summary.decreasing?.motivo.nombre ?? "—"}
          hint={summary.decreasing ? `${summary.decreasing.delta.toFixed(1)}pp vs mes anterior` : ""}
          icon={<TrendingDown className="h-5 w-5" />}
          accent="var(--success)"
        />
        <MetricCard
          title="Cumplimiento (OK)"
          value={summary.okCurrent == null ? "—" : `${summary.okCurrent.toFixed(0)}%`}
          hint={summary.okPrev != null ? `Mes anterior: ${summary.okPrev.toFixed(0)}%` : ""}
          icon={<Award className="h-5 w-5" />}
          accent="var(--success)"
        />
      </div>

      <Card className="card-elevated p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Análisis automático</h2>
            <p className="text-sm text-muted-foreground">Conclusiones generadas a partir de tus datos.</p>
          </div>
          <Button onClick={() => aiMutation.mutate()} disabled={aiMutation.isPending}>
            {aiMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            Generar con IA
          </Button>
        </div>

        <ul className="space-y-3">
          {summary.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm">{b}</p>
            </li>
          ))}
        </ul>

        {aiText && (
          <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Análisis IA</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{aiText}</p>
          </div>
        )}
      </Card>

      <Card className="card-elevated p-6">
        <h2 className="text-lg font-semibold tracking-tight">Ranking histórico de causas</h2>
        <p className="text-sm text-muted-foreground">Promedio de aporte al retraso.</p>
        <div className="mt-4 space-y-3">
          {summary.ranking.map((s, i) => {
            const max = summary.ranking[0]?.avg || 1;
            const width = (s.avg / max) * 100;
            return (
              <div key={s.motivo.id} className="flex items-center gap-3">
                <span className="w-6 text-sm text-muted-foreground tabular-nums">#{i + 1}</span>
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium">{s.motivo.nombre}</span>
                    <Badge variant="secondary" className="tabular-nums">{s.avg.toFixed(1)}%</Badge>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${width}%`, background: s.motivo.color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <p className="text-xs text-muted-foreground">
        pp = puntos porcentuales · basado en {indicadores.length} registro{indicadores.length !== 1 ? "s" : ""}
        {" · "}{periodKey(latest.anio, latest.mes)} referencia.
      </p>
    </div>
  );
}

function EmptyInsights() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-muted">
          <Sparkles className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-xl font-semibold">Aún no hay datos suficientes</h2>
        <p className="mt-2 text-sm text-muted-foreground">Registra al menos un mes para ver los insights.</p>
      </div>
    </div>
  );
}

function MetricCard({
  title, value, hint, icon, accent = "var(--primary)",
}: { title: string; value: string; hint?: string; icon: React.ReactNode; accent?: string }) {
  return (
    <Card className="card-elevated relative overflow-hidden p-5">
      <div aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: accent }} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="mt-2 truncate text-xl font-bold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-primary-foreground" style={{ background: accent }}>
          {icon}
        </span>
      </div>
    </Card>
  );
}

function buildAiPrompt(
  enriched: { anio: number; mes: number; motivo: string; porcentaje: number }[],
  motivos: { nombre: string }[],
  periods: { anio: number; mes: number }[],
) {
  const lines: string[] = [];
  lines.push("Eres un analista de operaciones. Analiza los siguientes indicadores mensuales de causas de retraso en la entrega de proyectos.");
  lines.push("Genera un análisis ejecutivo en español, en 4-6 frases claras y concretas, destacando: motivo principal, tendencias, mejoras y recomendaciones. Usa lenguaje profesional y evita listas.");
  lines.push("\nDatos (últimos meses):");
  for (const p of periods) {
    const rows = enriched.filter((r) => r.anio === p.anio && r.mes === p.mes);
    lines.push(`- ${MONTH_NAMES_ES[p.mes - 1]} ${p.anio}: ` + rows.map((r) => `${r.motivo} ${r.porcentaje}%`).join(", "));
  }
  lines.push(`\nMotivos monitoreados: ${motivos.map((m) => m.nombre).join(", ")}.`);
  return lines.join("\n");
}
