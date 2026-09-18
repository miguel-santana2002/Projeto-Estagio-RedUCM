export interface AuditLog {
  id: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  model_name: string;
  object_id: string;
  object_repr: string;
  actor: string | null;
  changes: any;
  timestamp: string;
}