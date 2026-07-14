import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Motivo = {
  id: string;
  nombre: string;
  color: string;
  activo: boolean;
  orden: number;
};

export type Indicador = {
  id: string;
  anio: number;
  mes: number;
  motivo_id: string;
  porcentaje: number;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
};

export const motivosQuery = () =>
  queryOptions({
    queryKey: ["motivos"],
    queryFn: async (): Promise<Motivo[]> => {
      const { data, error } = await supabase
        .from("motivos")
        .select("*")
        .order("orden", { ascending: true });
      if (error) throw error;
      return data as Motivo[];
    },
  });

export const indicadoresQuery = () =>
  queryOptions({
    queryKey: ["indicadores"],
    queryFn: async (): Promise<Indicador[]> => {
      const { data, error } = await supabase
        .from("indicadores_mensuales")
        .select("*")
        .order("anio", { ascending: true })
        .order("mes", { ascending: true });
      if (error) throw error;
      return data as Indicador[];
    },
  });

export const currentRoleQuery = () =>
  queryOptions({
    queryKey: ["current-role"],
    queryFn: async (): Promise<"admin" | "consulta" | null> => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return "admin";
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);
      if (error) throw error;
      const roles = (data ?? []).map((r) => r.role);
      if (roles.includes("admin")) return "admin";
      if (roles.includes("consulta")) return "consulta";
      return null;
    },
  });

export const profileQuery = () =>
  queryOptions({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .maybeSingle();
      return data;
    },
  });
