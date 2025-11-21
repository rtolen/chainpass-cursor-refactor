import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { callback_url, return_url } = await req.json();

    if (!callback_url && !return_url) {
      throw new Error('At least one URL must be provided');
    }

    // Get the business partner record for this user
    const { data: partnerData, error: partnerError } = await supabase
      .from('business_partners')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .single();

    if (partnerError || !partnerData) {
      throw new Error('Business partner not found or not approved');
    }

    // Update URLs
    const updateData: any = {};
    if (callback_url) updateData.callback_url = callback_url;
    if (return_url) updateData.return_url = return_url;

    const { data: updatedPartner, error: updateError } = await supabase
      .from('business_partners')
      .update(updateData)
      .eq('id', partnerData.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating partner URLs:', updateError);
      throw updateError;
    }

    console.log(`URLs updated for business partner: ${partnerData.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        partner: updatedPartner,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in update-partner-urls function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
