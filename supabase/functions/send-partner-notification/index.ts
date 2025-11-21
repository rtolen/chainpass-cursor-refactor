import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not set');
    }
    
    const { type, data } = await req.json();

    if (type === 'approval') {
      const { business_name, contact_name, contact_email, api_key, callback_url, return_url, temp_password } = data;
      
      const htmlContent = `
        <h2>Congratulations! Your Business Partner Application Has Been Approved</h2>
        <p>Dear ${contact_name},</p>
        <p>We're excited to inform you that <strong>${business_name}</strong> has been approved as a ChainPass business partner!</p>
        
        <h3>Portal Access</h3>
        <p>You can now access the business partner portal at: <a href="https://yourapp.com/partner-portal">https://yourapp.com/partner-portal</a></p>
        <p><strong>Email:</strong> ${contact_email}</p>
        <p><strong>Temporary Password:</strong> ${temp_password}</p>
        <p><em>Please change your password after your first login.</em></p>
        
        <h3>Your API Credentials</h3>
        <p><strong>API Key:</strong> <code>${api_key}</code></p>
        <p><strong>Callback URL:</strong> ${callback_url}</p>
        <p><strong>Return URL:</strong> ${return_url}</p>
        
        <h3>Integration Documentation</h3>
        <p>To integrate ChainPass V.A.I. verification into your application:</p>
        <ol>
          <li>Redirect users to: <code>https://yourapp.com?business_id=YOUR_BUSINESS_ID&user_id=USER_ID</code></li>
          <li>We'll send verification results to your callback URL via POST request</li>
          <li>Users will be redirected back to your return URL after verification</li>
        </ol>
        
        <p>Keep your API key secure and never expose it in client-side code.</p>
        
        <p>Best regards,<br>The ChainPass Team</p>
      `;

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'ChainPass <onboarding@chainpass.com>',
          to: contact_email,
          subject: `${business_name} - Business Partner Application Approved`,
          html: htmlContent,
        }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.text();
        throw new Error(`Failed to send email: ${errorData}`);
      }
    } else if (type === 'rejection') {
      const { business_name, contact_name, contact_email, reason } = data;
      
      const htmlContent = `
        <h2>Business Partner Application Update</h2>
        <p>Dear ${contact_name},</p>
        <p>Thank you for your interest in becoming a ChainPass business partner.</p>
        <p>After careful review, we're unable to approve the application for <strong>${business_name}</strong> at this time.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>If you have any questions or would like to discuss this further, please don't hesitate to contact us.</p>
        <p>Best regards,<br>The ChainPass Team</p>
      `;

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'ChainPass <onboarding@chainpass.com>',
          to: contact_email,
          subject: `${business_name} - Business Partner Application Status`,
          html: htmlContent,
        }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.text();
        throw new Error(`Failed to send email: ${errorData}`);
      }
    } else {
      throw new Error('Invalid notification type');
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in send-partner-notification function:', error);
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
