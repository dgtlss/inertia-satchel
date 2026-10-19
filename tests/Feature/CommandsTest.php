<?php

use Illuminate\Support\Facades\Artisan;

it('lists package paths, effective sources, override status, and drift', function () {
    $this->writeOverride('Invoices/Index.vue', 'customized');
    $this->writeOverride('Invoices/Show.vue', file_get_contents($this->packageRoot().'/Invoices/Show.vue'));
    $this->writeOverride('Reports/Custom.vue', 'app only');

    expect(Artisan::call('satchel:list'))->toBe(0);
    $output = Artisan::output();

    expect($output)->toContain('Package source', 'Resolved source', 'Overridden', 'Drifted')
        ->toContain($this->packageRoot().'/Invoices/Index.vue')
        ->toMatch('/acme-billing::Invoices\/Index[^\n]+yes[^\n]+yes/')
        ->toMatch('/acme-billing::Invoices\/Show[^\n]+yes[^\n]+no/')
        ->toMatch('/acme-billing::Dashboard[^\n]+no[^\n]+no/')
        ->toMatch('/acme-billing::Reports\/Custom[^\n]+yes[^\n]+n\/a/');
});

it('publishes one nested package page without changing the package source', function () {
    $source = $this->packageRoot().'/Invoices/Index.vue';
    $before = hash_file('sha256', $source);
    $this->artisan('satchel:publish', ['page' => 'acme-billing::Invoices/Index'])->assertSuccessful();

    $page = $this->resolver()->resolve('acme-billing::Invoices/Index');
    expect($page->path)->toBe($this->sandbox.'/resources/js/Pages/vendor/acme-billing/Invoices/Index.vue')
        ->and(file_get_contents($page->path))->toBe(file_get_contents($source))
        ->and($page->isOverridden())->toBeTrue()->and($page->isDrifted())->toBeFalse()
        ->and(hash_file('sha256', $source))->toBe($before);
});

it('publishes all shipped pages and excludes other assets and app-only pages', function () {
    $this->writeOverride('Reports/Custom.vue', 'app only');
    $this->artisan('satchel:publish', ['--all' => true])->assertSuccessful();

    foreach (['Dashboard.tsx', 'Invoices/Index.vue', 'Invoices/Show.vue'] as $page) {
        expect(file_get_contents($this->sandbox.'/resources/js/Pages/vendor/acme-billing/'.$page))
            ->toBe(file_get_contents($this->packageRoot().'/'.$page));
    }

    expect(file_get_contents($this->sandbox.'/resources/js/Pages/vendor/acme-billing/Reports/Custom.vue'))->toBe('app only')
        ->and(is_file($this->sandbox.'/resources/js/Pages/vendor/acme-billing/README.md'))->toBeFalse();
});

it('preserves existing overrides including those with a different extension', function (string $extension) {
    $override = $this->writeOverride('Invoices/Index.'.$extension, 'keep my customization');

    $this->artisan('satchel:publish', ['page' => 'acme-billing::Invoices/Index'])
        ->expectsOutputToContain('Skipped acme-billing::Invoices/Index')->assertSuccessful();

    expect(file_get_contents($override))->toBe('keep my customization');
    if ($extension !== 'vue') {
        expect(is_file(dirname($override).'/Index.vue'))->toBeFalse();
    }
})->with(['vue', 'tsx']);

it('replaces the override and clears drift with force', function (string $extension) {
    $override = $this->writeOverride('Invoices/Index.'.$extension, 'custom');
    $this->artisan('satchel:publish', ['page' => 'acme-billing::Invoices/Index', '--force' => true])->assertSuccessful();

    $page = $this->resolver()->resolve('acme-billing::Invoices/Index');
    expect(file_get_contents($page->path))->toBe(file_get_contents($page->packagePath))
        ->and($page->isDrifted())->toBeFalse();
    if ($extension !== 'vue') {
        expect(file_exists($override))->toBeFalse();
    }
})->with(['vue', 'tsx']);

it('safely repeats publishing all pages without force', function () {
    $this->artisan('satchel:publish', ['--all' => true])->assertSuccessful();
    $override = $this->writeOverride('Invoices/Index.vue', 'edited after publishing');
    $this->artisan('satchel:publish', ['--all' => true])->assertSuccessful();

    expect(file_get_contents($override))->toBe('edited after publishing');
});

it('requires one page selector or all', function (array $arguments) {
    $this->artisan('satchel:publish', $arguments)->expectsOutputToContain('Specify one namespace::Page or --all.')->assertExitCode(2);
})->with([[[]], [['page' => 'acme-billing::Invoices/Index', '--all' => true]]]);

it('fails usefully for unknown or malformed pages', function (string $component) {
    $this->artisan('satchel:publish', ['page' => $component])->assertFailed();
})->with(['missing::Index', 'acme-billing::Missing', 'acme-billing::../Index']);

it('cannot publish an app-only page over itself', function () {
    $override = $this->writeOverride('Reports/Custom.vue', 'custom app page');
    $this->artisan('satchel:publish', ['page' => 'acme-billing::Reports/Custom', '--force' => true])
        ->expectsOutputToContain('has no package source')->assertFailed();

    expect(file_get_contents($override))->toBe('custom app page');
});

it('refuses to publish through an escaping namespace symlink', function () {
    mkdir($this->sandbox.'/outside');
    mkdir($this->sandbox.'/resources/js/Pages/vendor', 0777, true);
    symlink($this->sandbox.'/outside', $this->sandbox.'/resources/js/Pages/vendor/acme-billing');

    $this->artisan('satchel:publish', ['page' => 'acme-billing::Invoices/Index', '--force' => true])->assertFailed();
    expect(scandir($this->sandbox.'/outside'))->toBe(['.', '..']);
});

it('preserves the target of an in-root symlink even when force is requested', function (string $kind) {
    $root = $this->sandbox.'/resources/js/Pages/vendor';

    if ($kind === 'file') {
        $original = $this->writeOverride('Invoices/Show.vue', 'unrelated page');
        symlink($original, dirname($original).'/Index.vue');
    } else {
        $original = $this->writeFile($root.'/shared/Invoices/Index.vue', 'unrelated page');
        symlink($root.'/shared', $root.'/acme-billing');
    }

    $this->artisan('satchel:publish', ['page' => 'acme-billing::Invoices/Index', '--force' => true])
        ->expectsOutputToContain('will not publish through a symlink')->assertFailed();
    expect(file_get_contents($original))->toBe('unrelated page');
})->with(['file', 'directory']);
