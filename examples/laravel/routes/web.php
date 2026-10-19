<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn () => Inertia::render('Home', ['message' => 'Props from Laravel']));
Route::get('/billing/invoices', fn () => Inertia::render('acme-billing::Invoices/Index', [
    'invoices' => [['id' => 42, 'reference' => 'INV-0042']],
]));
Route::get('/billing/invoices/{invoice}', fn (string $invoice) => Inertia::render('acme-billing::Invoices/Show', [
    'invoice' => ['id' => (int) $invoice, 'reference' => 'INV-'.str_pad($invoice, 4, '0', STR_PAD_LEFT)],
]));
