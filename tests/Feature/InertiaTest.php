<?php

use Dgtlss\Satchel\Exceptions\PageNotFoundException;
use Dgtlss\Satchel\Tests\Fixtures\BillingPage;
use Illuminate\Support\Facades\Route;
use Inertia\ComponentNotFoundException;
use Inertia\Inertia;
use Inertia\Testing\AssertableInertia;

it('renders a namespaced page in real Inertia JSON without exposing filesystem paths', function () {
    Route::get('/billing', fn () => Inertia::render('acme-billing::Invoices/Index', ['invoice' => 42]));
    Inertia::share('tenant', 'acme');
    Inertia::version('build-1');

    $this->get('/billing', ['X-Inertia' => 'true'])
        ->assertOk()->assertHeader('X-Inertia', 'true')
        ->assertJsonPath('component', 'acme-billing::Invoices/Index')
        ->assertJsonPath('props.invoice', 42)->assertJsonPath('props.tenant', 'acme')
        ->assertJsonPath('version', 'build-1')->assertDontSee($this->packageRoot(), false);
});

it('supports initial HTML and Inertias component existence assertion', function () {
    Route::get('/billing', fn () => Inertia::render('acme-billing::Invoices/Index'));

    $this->get('/billing')->assertOk()->assertInertia(fn (AssertableInertia $page) => $page
        ->component('acme-billing::Invoices/Index', true));
});

it('uses the same override resolution when strict page checks are enabled', function () {
    config(['inertia.pages.ensure_pages_exist' => true]);
    $override = $this->writeOverride('Invoices/Index.tsx', 'app');
    Route::get('/billing', fn () => Inertia::render('acme-billing::Invoices/Index'));

    $this->get('/billing', ['X-Inertia' => 'true'])->assertOk()
        ->assertJsonPath('component', 'acme-billing::Invoices/Index');
    expect(app('inertia.view-finder')->find('acme-billing::Invoices/Index'))->toBe($override);
});

it('validates namespaced pages even without Inertias optional strict check', function () {
    config(['inertia.pages.ensure_pages_exist' => false]);
    Inertia::render('acme-billing::Missing');
})->throws(PageNotFoundException::class);

it('keeps normal app pages and their strict checks working', function () {
    config(['inertia.pages.ensure_pages_exist' => true]);
    $this->writeFile($this->sandbox.'/resources/js/Pages/Home.vue', 'home');
    Route::get('/home', fn () => Inertia::render('Home', collect(['message' => 'hello'])));

    $this->get('/home', ['X-Inertia' => 'true'])->assertOk()
        ->assertJsonPath('component', 'Home')->assertJsonPath('props.message', 'hello');

    expect(fn () => Inertia::render('Missing'))->toThrow(ComponentNotFoundException::class);
});

it('preserves enum components', function () {
    Route::get('/billing', fn () => Inertia::render(BillingPage::Index));

    $this->get('/billing', ['X-Inertia' => 'true'])->assertOk()
        ->assertJsonPath('component', 'acme-billing::Invoices/Index');
});

it('preserves Inertia partial reloads with the canonical component identity', function () {
    Route::get('/billing', fn () => Inertia::render('acme-billing::Invoices/Index', [
        'invoice' => 42,
        'details' => Inertia::optional(fn () => 'loaded on demand'),
    ]));

    $this->get('/billing', ['X-Inertia' => 'true'])->assertJsonMissingPath('props.details');
    $this->get('/billing', [
        'X-Inertia' => 'true',
        'X-Inertia-Partial-Component' => 'acme-billing::Invoices/Index',
        'X-Inertia-Partial-Data' => 'details',
    ])->assertOk()->assertJsonPath('props.details', 'loaded on demand')->assertJsonMissingPath('props.invoice');
});
