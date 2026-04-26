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
      audit_logs: {
        Row: {
          action: string | null
          created_at: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      baixas: {
        Row: {
          aprovado_gestor_em: string | null
          aprovado_gestor_por: string | null
          aprovado_tecnico_em: string | null
          aprovado_tecnico_por: string | null
          av_numero: string | null
          created_at: string | null
          executado_em: string | null
          executado_por: string | null
          id: string
          justificativa: string
          motivo_rejeicao: string | null
          observacoes: string | null
          perfil_solicitante: string
          rejeitado_em: string | null
          rejeitado_por: string | null
          solicitado_por: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          aprovado_gestor_em?: string | null
          aprovado_gestor_por?: string | null
          aprovado_tecnico_em?: string | null
          aprovado_tecnico_por?: string | null
          av_numero?: string | null
          created_at?: string | null
          executado_em?: string | null
          executado_por?: string | null
          id?: string
          justificativa: string
          motivo_rejeicao?: string | null
          observacoes?: string | null
          perfil_solicitante: string
          rejeitado_em?: string | null
          rejeitado_por?: string | null
          solicitado_por?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          aprovado_gestor_em?: string | null
          aprovado_gestor_por?: string | null
          aprovado_tecnico_em?: string | null
          aprovado_tecnico_por?: string | null
          av_numero?: string | null
          created_at?: string | null
          executado_em?: string | null
          executado_por?: string | null
          id?: string
          justificativa?: string
          motivo_rejeicao?: string | null
          observacoes?: string | null
          perfil_solicitante?: string
          rejeitado_em?: string | null
          rejeitado_por?: string | null
          solicitado_por?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "baixas_aprovado_gestor_por_fkey"
            columns: ["aprovado_gestor_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "baixas_aprovado_tecnico_por_fkey"
            columns: ["aprovado_tecnico_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "baixas_executado_por_fkey"
            columns: ["executado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "baixas_rejeitado_por_fkey"
            columns: ["rejeitado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "baixas_solicitado_por_fkey"
            columns: ["solicitado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      chamados: {
        Row: {
          anexos: string[] | null
          atualizado_em: string | null
          chamado_pai_id: string | null
          deletado_em: string | null
          descricao: string
          descricao_encerramento: string | null
          encerrado_em: string | null
          gerado_em: string | null
          id: string
          os: string
          prioridade: Database["public"]["Enums"]["prioridade_chamado"] | null
          prioridade_alterada: string | null
          prioridade_alterada_por: string | null
          sla_deadline: string | null
          sla_violado: boolean | null
          sla_violado_em: string | null
          status: Database["public"]["Enums"]["chamado_status"] | null
          tecnico_id: string | null
          titulo: string | null
          usuario_id: string
          vinculado_em: string | null
          vinculado_por: string | null
        }
        Insert: {
          anexos?: string[] | null
          atualizado_em?: string | null
          chamado_pai_id?: string | null
          deletado_em?: string | null
          descricao: string
          descricao_encerramento?: string | null
          encerrado_em?: string | null
          gerado_em?: string | null
          id?: string
          os: string
          prioridade?: Database["public"]["Enums"]["prioridade_chamado"] | null
          prioridade_alterada?: string | null
          prioridade_alterada_por?: string | null
          sla_deadline?: string | null
          sla_violado?: boolean | null
          sla_violado_em?: string | null
          status?: Database["public"]["Enums"]["chamado_status"] | null
          tecnico_id?: string | null
          titulo?: string | null
          usuario_id: string
          vinculado_em?: string | null
          vinculado_por?: string | null
        }
        Update: {
          anexos?: string[] | null
          atualizado_em?: string | null
          chamado_pai_id?: string | null
          deletado_em?: string | null
          descricao?: string
          descricao_encerramento?: string | null
          encerrado_em?: string | null
          gerado_em?: string | null
          id?: string
          os?: string
          prioridade?: Database["public"]["Enums"]["prioridade_chamado"] | null
          prioridade_alterada?: string | null
          prioridade_alterada_por?: string | null
          sla_deadline?: string | null
          sla_violado?: boolean | null
          sla_violado_em?: string | null
          status?: Database["public"]["Enums"]["chamado_status"] | null
          tecnico_id?: string | null
          titulo?: string | null
          usuario_id?: string
          vinculado_em?: string | null
          vinculado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chamados_chamado_pai_id_fkey"
            columns: ["chamado_pai_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamados_prioridade_alterada_por_fkey"
            columns: ["prioridade_alterada_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamados_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamados_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamados_vinculado_por_fkey"
            columns: ["vinculado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comentarios_chamado: {
        Row: {
          atualizado_em: string | null
          autor_id: string
          chamado_id: string
          comentario: string
          criado_em: string | null
          deletado_em: string | null
          id: string
          visibilidade_interna: boolean | null
        }
        Insert: {
          atualizado_em?: string | null
          autor_id: string
          chamado_id: string
          comentario: string
          criado_em?: string | null
          deletado_em?: string | null
          id?: string
          visibilidade_interna?: boolean | null
        }
        Update: {
          atualizado_em?: string | null
          autor_id?: string
          chamado_id?: string
          comentario?: string
          criado_em?: string | null
          deletado_em?: string | null
          id?: string
          visibilidade_interna?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "comentarios_chamado_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comentarios_chamado_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_setor: {
        Row: {
          created_at: string | null
          id: string
          item_inventario_id: string | null
          quantidade: number | null
          setor: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_inventario_id?: string | null
          quantidade?: number | null
          setor: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_inventario_id?: string | null
          quantidade?: number | null
          setor?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_setor_item_inventario_id_fkey"
            columns: ["item_inventario_id"]
            isOneToOne: false
            referencedRelation: "itens_inventario"
            referencedColumns: ["id"]
          },
        ]
      }
      expedientes: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          deletado_em: string | null
          entrada: string
          gerado_em: string | null
          id: string
          saida: string
          usuario_id: string
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          deletado_em?: string | null
          entrada: string
          gerado_em?: string | null
          id?: string
          saida: string
          usuario_id: string
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          deletado_em?: string | null
          entrada?: string
          gerado_em?: string | null
          id?: string
          saida?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expedientes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          cnpj: string | null
          created_at: string | null
          email: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      itens_baixa: {
        Row: {
          baixa_id: string | null
          created_at: string | null
          id: string
          item_inventario_id: string | null
          motivo: string | null
          quantidade: number
        }
        Insert: {
          baixa_id?: string | null
          created_at?: string | null
          id?: string
          item_inventario_id?: string | null
          motivo?: string | null
          quantidade: number
        }
        Update: {
          baixa_id?: string | null
          created_at?: string | null
          id?: string
          item_inventario_id?: string | null
          motivo?: string | null
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_baixa_baixa_id_fkey"
            columns: ["baixa_id"]
            isOneToOne: false
            referencedRelation: "baixas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_baixa_item_inventario_id_fkey"
            columns: ["item_inventario_id"]
            isOneToOne: false
            referencedRelation: "itens_inventario"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_inventario: {
        Row: {
          categoria_id: string | null
          created_at: string | null
          criado_por: string | null
          descricao: string | null
          estoque_atual: number | null
          estoque_minimo: number | null
          id: string
          nome: string
          numero: string
          oc_numero: string | null
          sku: string
          unidade: string
          updated_at: string | null
        }
        Insert: {
          categoria_id?: string | null
          created_at?: string | null
          criado_por?: string | null
          descricao?: string | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          id?: string
          nome: string
          numero: string
          oc_numero?: string | null
          sku: string
          unidade: string
          updated_at?: string | null
        }
        Update: {
          categoria_id?: string | null
          created_at?: string | null
          criado_por?: string | null
          descricao?: string | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          id?: string
          nome?: string
          numero?: string
          oc_numero?: string | null
          sku?: string
          unidade?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itens_inventario_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_inventario_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_solicitacao_compra: {
        Row: {
          created_at: string | null
          id: string
          item_inventario_id: string | null
          nome_produto: string
          preco_estimado: number | null
          preco_real: number | null
          quantidade: number
          solicitacao_compra_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_inventario_id?: string | null
          nome_produto: string
          preco_estimado?: number | null
          preco_real?: number | null
          quantidade: number
          solicitacao_compra_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_inventario_id?: string | null
          nome_produto?: string
          preco_estimado?: number | null
          preco_real?: number | null
          quantidade?: number
          solicitacao_compra_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itens_solicitacao_compra_item_inventario_id_fkey"
            columns: ["item_inventario_id"]
            isOneToOne: false
            referencedRelation: "itens_inventario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_solicitacao_compra_solicitacao_compra_id_fkey"
            columns: ["solicitacao_compra_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_estoque: {
        Row: {
          created_at: string | null
          estoque_after: number
          estoque_before: number
          id: string
          item_id: string | null
          motivo: string
          observacoes: string | null
          quantidade: number
          realizado_por: string | null
          referencia_id: string | null
          setor_destino_id: string | null
          setor_destino_nome: string | null
          tipo: string
        }
        Insert: {
          created_at?: string | null
          estoque_after: number
          estoque_before: number
          id?: string
          item_id?: string | null
          motivo: string
          observacoes?: string | null
          quantidade: number
          realizado_por?: string | null
          referencia_id?: string | null
          setor_destino_id?: string | null
          setor_destino_nome?: string | null
          tipo: string
        }
        Update: {
          created_at?: string | null
          estoque_after?: number
          estoque_before?: number
          id?: string
          item_id?: string | null
          motivo?: string
          observacoes?: string | null
          quantidade?: number
          realizado_por?: string | null
          referencia_id?: string | null
          setor_destino_id?: string | null
          setor_destino_nome?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "itens_inventario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_realizado_por_fkey"
            columns: ["realizado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_de_servico: {
        Row: {
          atualizado_em: string | null
          chamado_id: string
          deletado_em: string | null
          gerado_em: string | null
          id: string
          servico_id: string
        }
        Insert: {
          atualizado_em?: string | null
          chamado_id: string
          deletado_em?: string | null
          gerado_em?: string | null
          id?: string
          servico_id: string
        }
        Update: {
          atualizado_em?: string | null
          chamado_id?: string
          deletado_em?: string | null
          gerado_em?: string | null
          id?: string
          servico_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordens_de_servico_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_de_servico_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          email_settings: Json | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          email_settings?: Json | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          email_settings?: Json | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          avatar_url: string | null
          created_at: string
          deletado_em: string | null
          department_id: string | null
          email: string
          gerado_em: string | null
          id: string
          is_master: boolean | null
          nivel: Database["public"]["Enums"]["nivel_tecnico"] | null
          nome: string | null
          organization_id: string | null
          position_id: string | null
          ramal: string | null
          regra: Database["public"]["Enums"]["regra"]
          setor: Database["public"]["Enums"]["setor"] | null
          sobrenome: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          avatar_url?: string | null
          created_at?: string
          deletado_em?: string | null
          department_id?: string | null
          email: string
          gerado_em?: string | null
          id: string
          is_master?: boolean | null
          nivel?: Database["public"]["Enums"]["nivel_tecnico"] | null
          nome?: string | null
          organization_id?: string | null
          position_id?: string | null
          ramal?: string | null
          regra?: Database["public"]["Enums"]["regra"]
          setor?: Database["public"]["Enums"]["setor"] | null
          sobrenome?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          avatar_url?: string | null
          created_at?: string
          deletado_em?: string | null
          department_id?: string | null
          email?: string
          gerado_em?: string | null
          id?: string
          is_master?: boolean | null
          nivel?: Database["public"]["Enums"]["nivel_tecnico"] | null
          nome?: string | null
          organization_id?: string | null
          position_id?: string | null
          ramal?: string | null
          regra?: Database["public"]["Enums"]["regra"]
          setor?: Database["public"]["Enums"]["setor"] | null
          sobrenome?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reembolsos: {
        Row: {
          aprovado_em: string | null
          aprovador_id: string | null
          atualizado_em: string | null
          categoria: Database["public"]["Enums"]["categoria_reembolso"]
          comprovante_pagamento_url: string | null
          deletado_em: string | null
          descricao: string
          gerado_em: string | null
          id: string
          motivo_rejeicao: string | null
          numero: string
          pagador_id: string | null
          pago_em: string | null
          setor: Database["public"]["Enums"]["setor"] | null
          solicitante_id: string
          status: Database["public"]["Enums"]["reembolso_status"] | null
          valor: number
        }
        Insert: {
          aprovado_em?: string | null
          aprovador_id?: string | null
          atualizado_em?: string | null
          categoria: Database["public"]["Enums"]["categoria_reembolso"]
          comprovante_pagamento_url?: string | null
          deletado_em?: string | null
          descricao: string
          gerado_em?: string | null
          id?: string
          motivo_rejeicao?: string | null
          numero: string
          pagador_id?: string | null
          pago_em?: string | null
          setor?: Database["public"]["Enums"]["setor"] | null
          solicitante_id: string
          status?: Database["public"]["Enums"]["reembolso_status"] | null
          valor: number
        }
        Update: {
          aprovado_em?: string | null
          aprovador_id?: string | null
          atualizado_em?: string | null
          categoria?: Database["public"]["Enums"]["categoria_reembolso"]
          comprovante_pagamento_url?: string | null
          deletado_em?: string | null
          descricao?: string
          gerado_em?: string | null
          id?: string
          motivo_rejeicao?: string | null
          numero?: string
          pagador_id?: string | null
          pago_em?: string | null
          setor?: Database["public"]["Enums"]["setor"] | null
          solicitante_id?: string
          status?: Database["public"]["Enums"]["reembolso_status"] | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "reembolsos_aprovador_id_fkey"
            columns: ["aprovador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reembolsos_pagador_id_fkey"
            columns: ["pagador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reembolsos_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          deletado_em: string | null
          descricao: string | null
          gerado_em: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          deletado_em?: string | null
          descricao?: string | null
          gerado_em?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          deletado_em?: string | null
          descricao?: string | null
          gerado_em?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      solicitacoes_compra: {
        Row: {
          ac_numero: string
          aprovado_em: string | null
          aprovado_por: string | null
          created_at: string | null
          data_emissao: string | null
          executado_em: string | null
          executado_por: string | null
          forma_pagamento: string | null
          fornecedor_id: string | null
          id: string
          justificativa: string | null
          motivo_rejeicao: string | null
          nfe: string | null
          observacoes: string | null
          oc_numero: string | null
          parcelas: number | null
          rejeitado_em: string | null
          rejeitado_por: string | null
          setor_solicitante: string | null
          solicitado_por: string | null
          status: string | null
          updated_at: string | null
          valor_total: number | null
        }
        Insert: {
          ac_numero: string
          aprovado_em?: string | null
          aprovado_por?: string | null
          created_at?: string | null
          data_emissao?: string | null
          executado_em?: string | null
          executado_por?: string | null
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          id?: string
          justificativa?: string | null
          motivo_rejeicao?: string | null
          nfe?: string | null
          observacoes?: string | null
          oc_numero?: string | null
          parcelas?: number | null
          rejeitado_em?: string | null
          rejeitado_por?: string | null
          setor_solicitante?: string | null
          solicitado_por?: string | null
          status?: string | null
          updated_at?: string | null
          valor_total?: number | null
        }
        Update: {
          ac_numero?: string
          aprovado_em?: string | null
          aprovado_por?: string | null
          created_at?: string | null
          data_emissao?: string | null
          executado_em?: string | null
          executado_por?: string | null
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          id?: string
          justificativa?: string | null
          motivo_rejeicao?: string | null
          nfe?: string | null
          observacoes?: string | null
          oc_numero?: string | null
          parcelas?: number | null
          rejeitado_em?: string | null
          rejeitado_por?: string | null
          setor_solicitante?: string | null
          solicitado_por?: string | null
          status?: string | null
          updated_at?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_compra_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_compra_executado_por_fkey"
            columns: ["executado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_compra_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_compra_rejeitado_por_fkey"
            columns: ["rejeitado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_compra_solicitado_por_fkey"
            columns: ["solicitado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transferencias_chamado: {
        Row: {
          chamado_id: string
          id: string
          motivo: string
          tecnico_anterior_id: string | null
          tecnico_novo_id: string
          transferido_em: string | null
          transferido_por: string
        }
        Insert: {
          chamado_id: string
          id?: string
          motivo: string
          tecnico_anterior_id?: string | null
          tecnico_novo_id: string
          transferido_em?: string | null
          transferido_por: string
        }
        Update: {
          chamado_id?: string
          id?: string
          motivo?: string
          tecnico_anterior_id?: string | null
          tecnico_novo_id?: string
          transferido_em?: string | null
          transferido_por?: string
        }
        Relationships: [
          {
            foreignKeyName: "transferencias_chamado_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_chamado_tecnico_anterior_id_fkey"
            columns: ["tecnico_anterior_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_chamado_tecnico_novo_id_fkey"
            columns: ["tecnico_novo_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_chamado_transferido_por_fkey"
            columns: ["transferido_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_is_master: { Args: never; Returns: boolean }
      get_my_organization_id: { Args: never; Returns: string }
      get_user_org: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_member_of_same_org: {
        Args: { _profile_org_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      log_user_action: { Args: { p_action: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "agent" | "customer"
      categoria_reembolso:
        | "TRANSPORTE"
        | "ALIMENTACAO"
        | "HOSPEDAGEM"
        | "MATERIAL"
        | "OUTRO"
      chamado_status:
        | "ABERTO"
        | "EM_ATENDIMENTO"
        | "ENCERRADO"
        | "CANCELADO"
        | "REABERTO"
      nivel_tecnico: "N1" | "N2" | "N3"
      prioridade_chamado: "P1" | "P2" | "P3" | "P4" | "P5"
      reembolso_status:
        | "PENDENTE"
        | "APROVADO"
        | "REJEITADO"
        | "PAGO"
        | "CANCELADO"
      regra:
        | "ADMIN"
        | "COMPRADOR"
        | "GESTOR"
        | "INVENTARIANTE"
        | "TECNICO"
        | "USUARIO"
      setor:
        | "ADMINISTRACAO"
        | "ALMOXARIFADO"
        | "CALL_CENTER"
        | "COMERCIAL"
        | "DEPARTAMENTO_PESSOAL"
        | "FINANCEIRO"
        | "JURIDICO"
        | "LOGISTICA"
        | "MARKETING"
        | "QUALIDADE"
        | "RECURSOS_HUMANOS"
        | "TECNOLOGIA_INFORMACAO"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status: "open" | "in_progress" | "waiting" | "resolved" | "closed"
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
    Enums: {
      app_role: ["admin", "agent", "customer"],
      categoria_reembolso: [
        "TRANSPORTE",
        "ALIMENTACAO",
        "HOSPEDAGEM",
        "MATERIAL",
        "OUTRO",
      ],
      chamado_status: [
        "ABERTO",
        "EM_ATENDIMENTO",
        "ENCERRADO",
        "CANCELADO",
        "REABERTO",
      ],
      nivel_tecnico: ["N1", "N2", "N3"],
      prioridade_chamado: ["P1", "P2", "P3", "P4", "P5"],
      reembolso_status: [
        "PENDENTE",
        "APROVADO",
        "REJEITADO",
        "PAGO",
        "CANCELADO",
      ],
      regra: [
        "ADMIN",
        "COMPRADOR",
        "GESTOR",
        "INVENTARIANTE",
        "TECNICO",
        "USUARIO",
      ],
      setor: [
        "ADMINISTRACAO",
        "ALMOXARIFADO",
        "CALL_CENTER",
        "COMERCIAL",
        "DEPARTAMENTO_PESSOAL",
        "FINANCEIRO",
        "JURIDICO",
        "LOGISTICA",
        "MARKETING",
        "QUALIDADE",
        "RECURSOS_HUMANOS",
        "TECNOLOGIA_INFORMACAO",
      ],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: ["open", "in_progress", "waiting", "resolved", "closed"],
    },
  },
} as const
