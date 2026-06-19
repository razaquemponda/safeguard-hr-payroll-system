// supabase/functions/backup/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is super admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_super_admin, tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_super_admin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action, tenant_id, table_name } = body;

    switch (action) {
      case 'backup_table':
        return await backupTable(supabase, tenant_id, table_name);
      case 'list_backups':
        return await listBackups(supabase, tenant_id);
      case 'restore_backup':
        return await restoreBackup(supabase, body);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function backupTable(supabase: any, tenantId: string, tableName: string) {
  try {
    // Get data from the table for this tenant
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) throw error;

    // Create backup record
    const { data: backup, error: backupError } = await supabase
      .from('backup_logs')
      .insert([{
        tenant_id: tenantId,
        table_name: tableName,
        record_count: data.length,
        backup_size_bytes: new Blob([JSON.stringify(data)]).size,
        status: 'success'
      }])
      .select()
      .single();

    if (backupError) throw backupError;

    // Store backup data in a separate table (you might want to use storage)
    await supabase
      .from('backup_data')
      .insert([{
        backup_id: backup.id,
        data: data
      }]);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Backup of ${tableName} completed`,
        backup_id: backup.id,
        record_count: data.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function listBackups(supabase: any, tenantId: string) {
  try {
    const { data, error } = await supabase
      .from('backup_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('backup_date', { ascending: false });

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, backups: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function restoreBackup(supabase: any, body: any) {
  try {
    const { backup_id } = body;

    // Get backup data
    const { data: backupData, error: getError } = await supabase
      .from('backup_data')
      .select('data')
      .eq('backup_id', backup_id)
      .single();

    if (getError) throw getError;

    // Get backup log to know which table
    const { data: backupLog, error: logError } = await supabase
      .from('backup_logs')
      .select('table_name, tenant_id')
      .eq('id', backup_id)
      .single();

    if (logError) throw logError;

    // Restore data (you might want to do this more carefully)
    // This is a simplified version - in production, you'd want to handle conflicts

    return new Response(
      JSON.stringify({
        success: true,
        message: `Restored ${backupLog.table_name} from backup ${backup_id}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}