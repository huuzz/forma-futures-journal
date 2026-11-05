import Link from 'next/link';
import { ArrowUpRight, NotebookPen } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
export default function Dashboard() { return <><p className="eyebrow mb-3">YOUR TRADING, IN PERSPECTIVE</p><h1 className="page-title">Dashboard</h1><p className="page-description mb-8">A clear view of your performance and your process.</p><Card className="py-16 text-center"><NotebookPen className="mx-auto mb-5 size-9 text-primary"/><h2 className="text-xl font-medium">Every insight starts with a trade.</h2><p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">Record your execution, capture your thinking, and begin building a clearer picture of your trading.</p><Button asChild className="mt-7"><Link href="/trades/new">Journal your first trade<ArrowUpRight className="size-4"/></Link></Button></Card></>; }
