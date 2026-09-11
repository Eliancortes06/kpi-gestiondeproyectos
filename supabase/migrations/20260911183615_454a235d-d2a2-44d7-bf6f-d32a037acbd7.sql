CREATE TABLE public.indicadores_cumplimiento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('cronograma','capex')),
  anio integer NOT NULL,
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  numerador numeric NOT NULL DEFAULT 0,
  denominador numeric NOT NULL DEFAULT 0,
  observaciones text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tipo, anio, mes)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.indicadores_cumplimiento TO anon, authenticated;
GRANT ALL ON public.indicadores_cumplimiento TO service_role;

ALTER TABLE public.indicadores_cumplimiento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read indicadores cumplimiento" ON public.indicadores_cumplimiento FOR SELECT USING (true);
CREATE POLICY "public write indicadores cumplimiento" ON public.indicadores_cumplimiento FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER set_updated_at_indicadores_cumplimiento
BEFORE UPDATE ON public.indicadores_cumplimiento
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();