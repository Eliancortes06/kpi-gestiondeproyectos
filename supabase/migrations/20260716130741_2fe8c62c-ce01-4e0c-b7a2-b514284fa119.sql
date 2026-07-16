
UPDATE public.motivos SET nombre = 'Sub-assembly' WHERE nombre = 'Assembly + Sub-assembly';
UPDATE public.motivos SET activo = false WHERE nombre = 'Design';

INSERT INTO public.motivos (nombre, color, activo, orden) VALUES
  ('On Time', '#22C55E', true, 1),
  ('Customer Definitions', '#F59E0B', true, 2),
  ('Missing Components', '#EF4444', true, 3),
  ('Chassis', '#3B82F6', true, 4),
  ('Labor', '#8B5CF6', true, 5),
  ('Tank', '#06B6D4', true, 6),
  ('Logistics', '#EC4899', true, 7),
  ('BOM', '#F97316', true, 8),
  ('Sub-assembly', '#14B8A6', true, 9)
ON CONFLICT DO NOTHING;

UPDATE public.proyectos_seguimiento SET motivo = 'On Time' WHERE lower(trim(motivo)) IN ('ok','on time');
UPDATE public.proyectos_seguimiento SET motivo = 'Customer Definitions' WHERE lower(trim(motivo)) IN ('definiciones del cliente','definicion del cliente','definiciones cliente','cambio de requerimiento del cliente','customer definitions');
UPDATE public.proyectos_seguimiento SET motivo = 'Missing Components' WHERE lower(trim(motivo)) IN ('faltantes','componentes faltantes','missing components');
UPDATE public.proyectos_seguimiento SET motivo = 'Chassis' WHERE lower(trim(motivo)) IN ('chassis','chasis');
UPDATE public.proyectos_seguimiento SET motivo = 'Labor' WHERE lower(trim(motivo)) IN ('mano de obra','labor');
UPDATE public.proyectos_seguimiento SET motivo = 'Tank' WHERE lower(trim(motivo)) IN ('tanque','tank');
UPDATE public.proyectos_seguimiento SET motivo = 'Logistics' WHERE lower(trim(motivo)) IN ('logistica','logística','logistics');
UPDATE public.proyectos_seguimiento SET motivo = 'BOM' WHERE lower(trim(motivo)) = 'bom';
UPDATE public.proyectos_seguimiento SET motivo = 'Sub-assembly' WHERE lower(trim(motivo)) IN ('sub-assembly','sub assembly','subassembly','assembly + sub-assembly','assembly');
UPDATE public.proyectos_seguimiento SET motivo = NULL WHERE lower(trim(motivo)) IN ('diseño','design');
