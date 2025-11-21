import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the active retention policy
    const { data: policy, error: policyError } = await supabase
      .from('retention_policies')
      .select('*')
      .single();

    if (policyError) {
      console.error('Error fetching retention policy:', policyError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch retention policy' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate the cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retention_days);

    // Fetch old logs that need to be processed
    const { data: oldLogs, error: fetchError } = await supabase
      .from('admin_activity_logs')
      .select('*')
      .lt('created_at', cutoffDate.toISOString());

    if (fetchError) {
      console.error('Error fetching old logs:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch old logs' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let archivedCount = 0;
    let deletedCount = 0;

    if (oldLogs && oldLogs.length > 0) {
      // Archive logs if enabled
      if (policy.archive_before_delete) {
        const archivedLogs = oldLogs.map(log => ({
          original_log_id: log.id,
          admin_user_id: log.admin_user_id,
          action_type: log.action_type,
          target_user_id: log.target_user_id,
          target_user_email: log.target_user_email,
          details: log.details,
          ip_address: log.ip_address,
          user_agent: log.user_agent,
          original_created_at: log.created_at,
        }));

        const { error: archiveError } = await supabase
          .from('archived_activity_logs')
          .insert(archivedLogs);

        if (archiveError) {
          console.error('Error archiving logs:', archiveError);
          return new Response(
            JSON.stringify({ error: 'Failed to archive logs' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        archivedCount = oldLogs.length;
      }

      // Delete logs if auto-delete is enabled
      if (policy.auto_delete_enabled) {
        const logIds = oldLogs.map(log => log.id);
        const { error: deleteError } = await supabase
          .from('admin_activity_logs')
          .delete()
          .in('id', logIds);

        if (deleteError) {
          console.error('Error deleting logs:', deleteError);
          return new Response(
            JSON.stringify({ error: 'Failed to delete logs' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        deletedCount = oldLogs.length;
      }
    }

    // Update last run timestamp
    await supabase
      .from('retention_policies')
      .update({ last_run_at: new Date().toISOString() })
      .eq('id', policy.id);

    return new Response(
      JSON.stringify({
        success: true,
        archivedCount,
        deletedCount,
        cutoffDate: cutoffDate.toISOString(),
        policy: {
          retention_days: policy.retention_days,
          archive_enabled: policy.archive_before_delete,
          auto_delete_enabled: policy.auto_delete_enabled,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
