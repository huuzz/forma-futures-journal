'use client';
import { Button } from '@/components/ui/button';
export default function ErrorPage({reset}:{error:Error & {digest?:string};reset:()=>void}) { return <div className="mx-auto my-24 max-w-md p-6"><h1 className="page-title">Something interrupted your journal.</h1><p className="page-description mb-6">Your saved records are unchanged. Check your connection and Supabase configuration, then try again.</p><Button onClick={reset}>Try again</Button></div>; }
