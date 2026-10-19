import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from '@inertiajs/react';

export default function BillingLayout({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  return <div className="mx-auto max-w-3xl space-y-6 p-8">
    <header data-testid="vendor-layout" className="space-y-4 border-b border-slate-200 pb-5">
      <p>Acme Billing · React package layout</p>
      <nav className="flex gap-5 text-blue-700">
        <Link href="/">Home</Link>
        <Link href="/billing/invoices">Invoices</Link>
        <Link href="/billing/invoices/43">Next invoice</Link>
      </nav>
      <button data-testid="layout-counter" onClick={() => setCount(count + 1)}>Layout count: {count}</button>
    </header>
    <main>{children}</main>
  </div>;
}
