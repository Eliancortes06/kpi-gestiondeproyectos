UPDATE public.motivos SET nombre = CASE nombre
  WHEN 'OK' THEN 'On Time'
  WHEN 'Definiciones del cliente' THEN 'Customer Definitions'
  WHEN 'Componentes faltantes' THEN 'Missing Components'
  WHEN 'Mano de obra' THEN 'Labor'
  WHEN 'Tanque' THEN 'Tank'
  WHEN 'Diseño' THEN 'Design'
  WHEN 'Ensamble + Subensamble' THEN 'Assembly + Sub-assembly'
  WHEN 'Logística' THEN 'Logistics'
  ELSE nombre
END;