import { requireUser } from '@/lib/supabase/server';
import { Shell } from '@/components/shell';
export const dynamic='force-dynamic';
export default async function JournalLayout({children}:{children:React.ReactNode}) {
  const {user,supabase}=await requireUser();
  const {data:profile}=await supabase.from('profiles').select('display_name').eq('id',user.id).single();
  return <Shell name={profile?.display_name} email={user.email}>{children}</Shell>;
}
