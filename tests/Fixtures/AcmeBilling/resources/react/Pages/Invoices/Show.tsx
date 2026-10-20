import BillingLayout from '../../Layouts/BillingLayout';
import { Head } from '@inertiajs/react';

function Show({ invoice }: { invoice: { id: number; reference: string } }) {
  return <section data-testid="vendor-card" className="space-y-3 rounded-xl bg-fuchsia-700 p-7 text-white">
    <Head title={invoice.reference} />
    <h1 data-testid="vendor-page">Package invoice</h1>
    <p data-testid="invoice-prop">{invoice.reference}</p>
    <p>This React page and its persistent layout are shipped by the example package.</p>
  </section>;
}
Show.layout = BillingLayout;
export default Show;
