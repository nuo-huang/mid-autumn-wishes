import { createHandler } from './handler.mjs';

const project = Deno.env.get('SUPABASE_URL') || '';
const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const origins = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(v => v.trim()).filter(Boolean);

Deno.serve(createHandler({
 allowedOrigins: origins,
 async rpc(name: string, value: Record<string, string>) {
  if (!project || !secret) throw new Error('Missing server configuration');
  const response = await fetch(`${project}/rest/v1/rpc/${name}`, {
   method: 'POST',
   headers: { apikey: secret, Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
   body: JSON.stringify(value),
   signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error('Database request failed');
  return await response.json();
 }
}));
