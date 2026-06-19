export const OPEN_STATUSES = ["ABERTO", "COTAÇÃO", "APROVAÇÃO", "COMPRA", "RECEBIMENTO"] as const;

export const MODULE_LABELS = {
  M1: "Produtos",
  M2: "Viagens",
  M3: "Serviços",
  M4: "Manutenção",
  M5: "Frete",
  M6: "Locação",
} as const;

export const URGENCY_LABELS = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
} as const;

export const STATUS_LABELS = {
  RASCUNHO: "Rascunho",
  ABERTO: "Aberto",
  COTAÇÃO: "Cotação",
  APROVAÇÃO: "Aprovação",
  COMPRA: "Compra",
  RECEBIMENTO: "Recebimento",
  CONCLUÍDO: "Concluído",
  CANCELADO: "Cancelado",
  REJEITADO: "Rejeitado",
} as const;

export type RequisitionModule = keyof typeof MODULE_LABELS;
export type RequisitionUrgency = keyof typeof URGENCY_LABELS;
export type RequisitionStatus = keyof typeof STATUS_LABELS;

export interface ProductItem {
  product_name: string;
  quantity: number;
  description: string;
  technical_specs: string;
  brand_preference: string;
  model_reference: string;
  reference_links: string[];
  online_purchase_suggestion: string;
  photo_path: string | null;
}

export interface ProductModuleData {
  items: ProductItem[];
  delivery_location: string;
  revenda: boolean;
  pedido_venda_numero: string | null;
  pedido_venda_vendedor: string | null;
  // Legado — requisições antigas (campo único)
  product_name?: string;
  quantity?: number;
  technical_specs?: string;
  brand_preference?: string;
  model_reference?: string;
  reference_links?: string[];
  online_purchase_suggestion?: string;
  photo_path?: string | null;
}

export interface RequisitionRecord {
  id: string;
  ticket_number: string;
  module: RequisitionModule;
  title: string;
  description: string;
  justification: string;
  urgency: RequisitionUrgency;
  status: RequisitionStatus;
  requester_name: string;
  requester_email: string | null;
  requester_department: string | null;
  desired_date: string | null;
  created_at: string;
  completed_at: string | null;
  module_data: ProductModuleData | Record<string, unknown>;
}

export interface DashboardStat {
  label: string;
  value: string;
  trend: string;
}

export interface DashboardModuleCard {
  title: string;
  desc: string;
  url: string;
  tag: RequisitionModule;
  count: number;
}

export interface DashboardRecentTicket {
  id: string;
  module: RequisitionModule;
  title: string;
  urgency: RequisitionUrgency;
  status: RequisitionStatus;
  date: string;
}
