import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';

export default function AppLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-3xl space-y-6 p-8">
    <header data-testid="app-layout" className="space-y-4 border-b border-slate-200 pb-5">
      <p>Satchel · React app layout</p>
      <nav className="flex gap-5 text-blue-700">
        <Link href="/">Home</Link>
        <Link href="/billing/invoices">Invoices</Link>
        <Link href="/billing/invoices/42">Vendor invoice</Link>
      </nav>
    </header>
    <main>{children}</main>
  </div>;
}
