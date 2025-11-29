// supabase/functions/my-function/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

serve(async (req) => {
  if (req.method === 'POST') {
    const { urlToExecute } = await req.json(); // Expecting a JSON body with a 'urlToExecute' property

    if (!urlToExecute) {
      return new Response(JSON.stringify({ error: 'Missing urlToExecute in request body' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    try {
      // Example: Fetch data from the provided URL
      const response = await fetch(urlToExecute);
      const data = await response.json(); // Or .text(), .blob(), etc. depending on the URL's content

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('Error executing URL:', error);
      return new Response(JSON.stringify({ error: 'Failed to execute URL', details: error.message }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      });
    }
  } else {
    return new Response('Method Not Allowed', { status: 405 });
  }
});