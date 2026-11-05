import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { publicConfig } from '@/lib/config';
export async function createClient() {
  const config = publicConfig();
  if (!config) throw new Error('Supabase is not configured. Follow the setup guide.');
  const store = await cookies();
  return createServerClient(config.url, config.key, { cookies: {
    getAll: () => store.getAll(),
    setAll: (values) => { try { values.forEach(({name,value,options}) => store.set(name,value,options)); } catch { /* Proxy handles refresh when server components cannot write cookies. */ } },
  }});
}
export async function requireUser() {
  if (!publicConfig()) redirect('/setup');
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/login');
  return { user, supabase };
}
