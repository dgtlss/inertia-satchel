import { Link } from '@inertiajs/react';
import AppLayout from '../../../../Layouts/AppLayout';

function Index({ invoices }: { invoices: { id: number; reference: string }[] }) {
  return <section className="space-y-4 rounded-xl bg-lime-100 p-6">
    <h1 data-testid="override-page">App invoice list override</h1>
    <ul>{invoices.map((invoice) => <li key={invoice.id}>
      <Link href={`/billing/invoices/${invoice.id}`}>{invoice.reference}</Link>
    </li>)}</ul>
  </section>;
}
Index.layout = AppLayout;
export default Index;
