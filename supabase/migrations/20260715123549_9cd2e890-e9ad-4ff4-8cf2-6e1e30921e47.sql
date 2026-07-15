
-- 1) Normalize project motivos to match motivos table (English)
UPDATE public.proyectos_seguimiento SET motivo = 'On Time' WHERE motivo IN ('OK','ok','On Time','on time');
UPDATE public.proyectos_seguimiento SET motivo = 'Design' WHERE motivo IN ('Diseño','diseño');
UPDATE public.proyectos_seguimiento SET motivo = 'Missing Components' WHERE motivo IN ('Faltantes','faltantes');
UPDATE public.proyectos_seguimiento SET motivo = 'Tank' WHERE motivo IN ('Tanque','tanque');
UPDATE public.proyectos_seguimiento SET motivo = 'Customer Definitions' WHERE motivo IN ('Definiciones del cliente','Cambio de requerimiento del cliente');
UPDATE public.proyectos_seguimiento SET motivo = NULL WHERE motivo IN ('False','false','');

-- 2) Public access (no login required). Allow anon to read/write all app tables.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.motivos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.indicadores_mensuales TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proyectos_seguimiento TO anon;
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.user_roles TO anon;

-- Replace policies to allow public access
DROP POLICY IF EXISTS "auth read motivos" ON public.motivos;
DROP POLICY IF EXISTS "admins manage motivos" ON public.motivos;
CREATE POLICY "public read motivos" ON public.motivos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public write motivos" ON public.motivos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth read indicadores" ON public.indicadores_mensuales;
DROP POLICY IF EXISTS "admins manage indicadores" ON public.indicadores_mensuales;
CREATE POLICY "public read indicadores" ON public.indicadores_mensuales FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public write indicadores" ON public.indicadores_mensuales FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth read proyectos" ON public.proyectos_seguimiento;
DROP POLICY IF EXISTS "admins manage proyectos" ON public.proyectos_seguimiento;
CREATE POLICY "public read proyectos" ON public.proyectos_seguimiento FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public write proyectos" ON public.proyectos_seguimiento FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
