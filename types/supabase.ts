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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      devis: {
        Row: {
          id: string
          devis_number: string
          client_nom: string
          client_tel: string | null
          client_email: string | null
          client_ville: string | null
          type_bien: string | null
          type_bien_autre: string | null
          superficie: string | null
          tour3d_price: number
          options_selected: string | null
          options_total: number
          hebergement_duree: string | null
          hebergement_price: number
          subtotal: number
          remise_pct: number
          remise_amt: number
          total_ttc: number
          notes: string | null
          validite_jours: number | null
          auto_pricing_used: boolean
          statut: string
          lead_id: string | null
          pdf_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          devis_number?: string
          client_nom: string
          client_tel?: string | null
          client_email?: string | null
          client_ville?: string | null
          type_bien?: string | null
          type_bien_autre?: string | null
          superficie?: string | null
          tour3d_price?: number
          options_selected?: string | null
          options_total?: number
          hebergement_duree?: string | null
          hebergement_price?: number
          subtotal?: number
          remise_pct?: number
          remise_amt?: number
          total_ttc?: number
          notes?: string | null
          validite_jours?: number | null
          auto_pricing_used?: boolean
          statut?: string
          lead_id?: string | null
          pdf_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          devis_number?: string
          client_nom?: string
          client_tel?: string | null
          client_email?: string | null
          client_ville?: string | null
          type_bien?: string | null
          type_bien_autre?: string | null
          superficie?: string | null
          tour3d_price?: number
          options_selected?: string | null
          options_total?: number
          hebergement_duree?: string | null
          hebergement_price?: number
          subtotal?: number
          remise_pct?: number
          remise_amt?: number
          total_ttc?: number
          notes?: string | null
          validite_jours?: number | null
          auto_pricing_used?: boolean
          statut?: string
          lead_id?: string | null
          pdf_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          id: string
          slug: string
          language: string
          linked_topic_id: string | null
          name: string
          excerpt: string | null
          content_html: string | null
          category: string | null
          category_label: string | null
          cover_image: string | null
          image_alt: string | null
          author_name: string | null
          read_time: string | null
          meta_title: string | null
          meta_description: string | null
          status: string
          published_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          language: string
          linked_topic_id?: string | null
          name: string
          excerpt?: string | null
          content_html?: string | null
          category?: string | null
          category_label?: string | null
          cover_image?: string | null
          image_alt?: string | null
          author_name?: string | null
          read_time?: string | null
          meta_title?: string | null
          meta_description?: string | null
          status?: string
          published_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          language?: string
          linked_topic_id?: string | null
          name?: string
          excerpt?: string | null
          content_html?: string | null
          category?: string | null
          category_label?: string | null
          cover_image?: string | null
          image_alt?: string | null
          author_name?: string | null
          read_time?: string | null
          meta_title?: string | null
          meta_description?: string | null
          status?: string
          published_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          appelTelephonique: string | null
          archive: string | null
          canal: string | null
          contacteSurWhatsapp: string | null
          date1erContact: string | null
          dateDeEchange: string | null
          dateFormulaire: string | null
          demoEnvoye: string | null
          devisEnvoye: string | null
          devisUrl: string | null
          email: string | null
          doublon: string | null
          leadId: string
          nom: string | null
          notes: string | null
          prixProposeMAD: string | null
          rappelDate: string | null
          rappelFait: boolean | null
          rappelNote: string | null
          relance1Auto: string | null
          relance2Auto: string | null
          relance3Auto: string | null
          relance1Fait: boolean | null
          relance2Fait: boolean | null
          relance3Fait: boolean | null
          statut: string | null
          surface: string | null
          telephone: string | null
          typeDeBien: string | null
          ville: string | null
        }
        Insert: {
          appelTelephonique?: string | null
          archive?: string | null
          canal?: string | null
          contacteSurWhatsapp?: string | null
          date1erContact?: string | null
          dateDeEchange?: string | null
          dateFormulaire?: string | null
          demoEnvoye?: string | null
          devisEnvoye?: string | null
          devisUrl?: string | null
          email?: string | null
          doublon?: string | null
          leadId: string
          nom?: string | null
          notes?: string | null
          prixProposeMAD?: string | null
          rappelDate?: string | null
          rappelFait?: boolean | null
          rappelNote?: string | null
          relance1Auto?: string | null
          relance2Auto?: string | null
          relance3Auto?: string | null
          relance1Fait?: boolean | null
          relance2Fait?: boolean | null
          relance3Fait?: boolean | null
          statut?: string | null
          surface?: string | null
          telephone?: string | null
          typeDeBien?: string | null
          ville?: string | null
        }
        Update: {
          appelTelephonique?: string | null
          archive?: string | null
          canal?: string | null
          contacteSurWhatsapp?: string | null
          date1erContact?: string | null
          dateDeEchange?: string | null
          dateFormulaire?: string | null
          demoEnvoye?: string | null
          devisEnvoye?: string | null
          devisUrl?: string | null
          email?: string | null
          doublon?: string | null
          leadId?: string
          nom?: string | null
          notes?: string | null
          prixProposeMAD?: string | null
          rappelDate?: string | null
          rappelFait?: boolean | null
          rappelNote?: string | null
          relance1Auto?: string | null
          relance2Auto?: string | null
          relance3Auto?: string | null
          relance1Fait?: boolean | null
          relance2Fait?: boolean | null
          relance3Fait?: boolean | null
          statut?: string | null
          surface?: string | null
          telephone?: string | null
          typeDeBien?: string | null
          ville?: string | null
        }
        Relationships: []
      }
      portfolio_projects: {
        Row: {
          id: string
          slug: string
          language: string
          linked_topic_id: string | null
          name: string
          description_html: string | null
          city: string | null
          sector: string | null
          surface: string | null
          delivery_time: string | null
          cover_image: string | null
          embed_url: string | null
          deliverables: Json
          meta_title: string | null
          meta_description: string | null
          status: string
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          language: string
          linked_topic_id?: string | null
          name: string
          description_html?: string | null
          city?: string | null
          sector?: string | null
          surface?: string | null
          delivery_time?: string | null
          cover_image?: string | null
          embed_url?: string | null
          deliverables?: Json
          meta_title?: string | null
          meta_description?: string | null
          status?: string
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          language?: string
          linked_topic_id?: string | null
          name?: string
          description_html?: string | null
          city?: string | null
          sector?: string | null
          surface?: string | null
          delivery_time?: string | null
          cover_image?: string | null
          embed_url?: string | null
          deliverables?: Json
          meta_title?: string | null
          meta_description?: string | null
          status?: string
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      tours: {
        Row: {
          id: string
          slug: string
          property_name: string
          client_name: string | null
          sector: string | null
          realsee_url: string | null
          active: boolean
          iframe: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          property_name: string
          client_name?: string | null
          sector?: string | null
          realsee_url?: string | null
          active?: boolean
          iframe?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          property_name?: string
          client_name?: string | null
          sector?: string | null
          realsee_url?: string | null
          active?: boolean
          iframe?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
