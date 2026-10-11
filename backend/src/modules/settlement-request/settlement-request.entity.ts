export type SettlementRequestStatus = 'pending' | 'approved' | 'rejected' | 'disbursed';

export type SettlementDestinationType = 'bank' | 'mobile_money';

export interface SettlementRequestRow {
  request_id: string;
  account_id: string;
  fund_id: string;
  requested_by_user_id: string;
  amount: number | string;
  status: SettlementRequestStatus;
  request_note: string | null;
  admin_note: string | null;
  destination_type: SettlementDestinationType;
  destination_account_name: string;
  destination_account_number: string;
  destination_bank_name: string | null;
  destination_bank_branch: string | null;
  destination_provider: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  disbursed_at: string | null;
  disbursement_reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettlementRequestHistoryRow {
  history_id: string;
  request_id: string;
  previous_status: SettlementRequestStatus | null;
  new_status: SettlementRequestStatus;
  changed_by_user_id: string;
  note: string | null;
  created_at: string;
}

export interface SettlementRequestView {
  request_id: string;
  account_id: string;
  account_name: string;
  fund_id: string;
  fund_name: string;
  requested_by_user_id: string;
  requester_name: string | null;
  requester_email: string | null;
  amount: number;
  status: SettlementRequestStatus;
  request_note: string | null;
  admin_note: string | null;
  destination_type: SettlementDestinationType;
  destination_account_name: string;
  destination_account_number: string;
  destination_bank_name: string | null;
  destination_bank_branch: string | null;
  destination_provider: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  disbursed_at: string | null;
  disbursement_reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettlementRequestHistoryView {
  history_id: string;
  previous_status: SettlementRequestStatus | null;
  new_status: SettlementRequestStatus;
  changed_by_user_id: string;
  changed_by_name: string | null;
  note: string | null;
  created_at: string;
}

export interface SettlementRequestDetailView extends SettlementRequestView {
  history: SettlementRequestHistoryView[];
  fund_collected: number;
  fund_disbursed: number;
}

export interface CreateSettlementRequestInput {
  account_id: string;
  fund_id: string;
  amount: number;
  request_note?: string | null;
}

export interface UpdateSettlementRequestStatusInput {
  status: Exclude<SettlementRequestStatus, 'pending'>;
  note?: string;
  disbursement_reference?: string;
}
