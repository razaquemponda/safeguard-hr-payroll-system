import { supabase } from '../lib/supabase';

export const logAudit = async (
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT',
  entityType: string,
  entityId: string,
  oldData?: any,
  newData?: any
) => {
  try {
    await supabase.rpc('log_audit_event', {
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_old_data: oldData || null,
      p_new_data: newData || null
    });
    console.log(`Audit log created: ${action} on ${entityType}`);
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
};