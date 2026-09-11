export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      indicadores_cumplimiento: {
        Row: {
          anio: number
          created_at: string
          created_by: string | null
          denominador: number
          id: string
          mes: number
          numerador: number
          observaciones: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          anio: number
          created_at?: string
          created_by?: string | null
          denominador?: number
          id?: string
          mes: number
          numerador?: number
          observaciones?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          anio?: number
          created_at?: string
          created_by?: string | null
          denominador?: number
          id?: string
          mes?: number
          numerador?: number
          observaciones?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      indicadores_mensuales: {
        Row: {
          anio: number
          created_at: string
          created_by: string | null
          id: string
          mes: number
          motivo_id: string
          observaciones: string | null
          porcentaje: number
          updated_at: string
        }
        Insert: {
          anio: number
          created_at?: string
          created_by?: string | null
          id?: string
          mes: number
          motivo_id: string
          observaciones?: string | null
          porcentaje: number
          updated_at?: string
        }
        Update: {
          anio?: number
          created_at?: string
          created_by?: string | null
          id?: string
          mes?: number
          motivo_id?: string
          observaciones?: string | null
          porcentaje?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "indicadores_mensuales_motivo_id_fkey"
            columns: ["motivo_id"]
            isOneToOne: false
            referencedRelation: "motivos"
            referencedColumns: ["id"]
          },
        ]
      }
      motivos: {
        Row: {
          activo: boolean
          color: string
          created_at: string
          id: string
          nombre: string
          orden: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          color?: string
          created_at?: string
          id?: string
          nombre: string
          orden?: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          color?: string
          created_at?: string
          id?: string
          nombre?: string
          orden?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          correo: string | null
          created_at: string
          id: string
          nombre: string | null
          updated_at: string
        }
        Insert: {
          correo?: string | null
          created_at?: string
          id: string
          nombre?: string | null
          updated_at?: string
        }
        Update: {
          correo?: string | null
          created_at?: string
          id?: string
          nombre?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      proyectos_seguimiento: {
        Row: {
          anio: number
          chassis_brand: string | null
          chassis_model: string | null
          chassis_status: string | null
          created_at: string
          created_by: string | null
          customer: string | null
          highlights: string | null
          id: string
          l5_model: string | null
          mes: number
          motivo: string | null
          production_end_date: string | null
          project_id: string
          project_manager: string | null
          project_name: string | null
          project_status: string | null
          promise_date: string | null
          tank_date_delivery: string | null
          tank_status: string | null
          tank_vin: string | null
          updated_at: string
        }
        Insert: {
          anio: number
          chassis_brand?: string | null
          chassis_model?: string | null
          chassis_status?: string | null
          created_at?: string
          created_by?: string | null
          customer?: string | null
          highlights?: string | null
          id?: string
          l5_model?: string | null
          mes: number
          motivo?: string | null
          production_end_date?: string | null
          project_id: string
          project_manager?: string | null
          project_name?: string | null
          project_status?: string | null
          promise_date?: string | null
          tank_date_delivery?: string | null
          tank_status?: string | null
          tank_vin?: string | null
          updated_at?: string
        }
        Update: {
          anio?: number
          chassis_brand?: string | null
          chassis_model?: string | null
          chassis_status?: string | null
          created_at?: string
          created_by?: string | null
          customer?: string | null
          highlights?: string | null
          id?: string
          l5_model?: string | null
          mes?: number
          motivo?: string | null
          production_end_date?: string | null
          project_id?: string
          project_manager?: string | null
          project_name?: string | null
          project_status?: string | null
          promise_date?: string | null
          tank_date_delivery?: string | null
          tank_status?: string | null
          tank_vin?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "consulta"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "consulta"],
    },
  },
} as const
