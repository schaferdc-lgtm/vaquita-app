export type UserRole = 'admin' | 'owner' | 'backer';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
}

export type ProjectCategory = 'construction' | 'party' | 'event' | 'other';

export interface Project {
  id: string; // Unique alphanumeric string (e.g. BANOS-CLUB, GRAD-PARTY)
  name: string;
  description: string;
  category: ProjectCategory;
  owner_id: string;
  created_at: string;
  avatar_url?: string;
  payment_alias?: string;
  payment_cbu?: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  is_deleted?: boolean; // soft delete
}

export interface ProjectComponent {
  id: string;
  project_id: string;
  name: string;
  unit_price: number;
  quantity: number; // original requested quantity
  remaining_quantity: number; // remaining quantity for full funding (can be floating point for partials)
  funded_amount: number; // accumulated currency for items that support partial funding
  allow_partial: boolean; // flag: unit_price > 100,000 and quantity < 3
  total_price: number; // quantity * unit_price
}

export interface Contribution {
  id: string;
  project_id: string;
  component_id: string;
  backer_id: string;
  backer_email: string;
  backer_name: string;
  amount: number; // contribution in $
  quantity_bought: number; // quantity bought (integer or decimal)
  coupon_code: string; // e.g. CUPON-8A9F-2B4C
  company_alias: string; // e.g. ALBA-ARENA.ALIAS, DJ-PARTY.ALIAS
  created_at: string;
  status?: 'pending' | 'approved' | 'rejected' | 'expired';
  payment_ticket?: string;
  payment_bank?: string;
  validated_at?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
}

export interface UserAction {
  id: string;
  user_email: string;
  action_type: string;
  details: string;
  created_at: string;
}

