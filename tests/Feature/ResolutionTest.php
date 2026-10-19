<?php

use Dgtlss\Satchel\Exceptions\PageNotFoundException;
use Dgtlss\Satchel\Facades\Satchel;

it('falls back to the package page with a stable component name', function () {
    $page = $this->resolver()->resolve('acme-billing::Invoices/Index');

    expect($page->path)->toBe($this->packageRoot().'/Invoices/Index.vue')
        ->and($page->component())->toBe('acme-billing::Invoices/Index')
        ->and($page->isOverridden())->toBeFalse()
        ->and($page->isDrifted())->toBeFalse();
});

it('gives app overrides precedence even across different extensions', function (string $extension) {
    $override = $this->writeOverride('Invoices/Index.'.$extension, 'app version');
    $page = $this->resolver()->resolve('acme-billing::Invoices/Index');

    expect($page->path)->toBe($override)
        ->and($page->packagePath)->toBe($this->packageRoot().'/Invoices/Index.vue')
        ->and($page->component())->toBe('acme-billing::Invoices/Index')
        ->and($page->isOverridden())->toBeTrue();
})->with(['vue', 'tsx', 'svelte']);

it('uses configured extension order within the selected source', function () {
    $this->writeFile($this->sandbox.'/package/Index.jsx', 'jsx');
    $vue = $this->writeFile($this->sandbox.'/package/Index.vue', 'vue');
    config(['satchel.extensions' => ['vue', 'jsx']]);
    Satchel::pages('choices', $this->sandbox.'/package');

    expect($this->resolver()->resolve('choices::Index')->path)->toBe($vue);

    $jsxOverride = $this->writeOverride('Index.jsx', 'app jsx', 'choices');
    expect($this->resolver()->resolve('choices::Index')->path)->toBe($jsxOverride);

    $vueOverride = $this->writeOverride('Index.vue', 'app vue', 'choices');
    expect($this->resolver()->resolve('choices::Index')->path)->toBe($vueOverride);
});

it('supports app-only pages inside a registered namespace', function () {
    $path = $this->writeOverride('Reports/Custom.vue', 'app report');
    $page = $this->resolver()->resolve('acme-billing::Reports/Custom');

    expect($page->path)->toBe($path)->and($page->packagePath)->toBeNull()
        ->and(array_map(fn ($page) => $page->component(), $this->resolver()->all()))
        ->toContain('acme-billing::Reports/Custom');
});

it('notices overrides added and removed after a first resolution', function () {
    $this->resolver()->resolve('acme-billing::Invoices/Index');
    $path = $this->writeOverride('Invoices/Index.vue', 'new override');
    expect($this->resolver()->resolve('acme-billing::Invoices/Index')->path)->toBe($path);
    unlink($path);
    expect($this->resolver()->resolve('acme-billing::Invoices/Index')->isOverridden())->toBeFalse();
});

it('rejects unknown namespaces', function () {
    $this->resolver()->resolve('unknown::Index');
})->throws(InvalidArgumentException::class, 'not registered');

it('reports missing pages', function () {
    $this->resolver()->resolve('acme-billing::Missing');
})->throws(PageNotFoundException::class);

it('rejects malformed component paths', function (string $component) {
    $this->resolver()->resolve($component);
})->with([
    'Index', 'acme-billing::', 'acme-billing::../Index', 'acme-billing::Invoices/../Index',
    'acme-billing::/Invoices/Index', 'acme-billing::Invoices//Index', 'acme-billing::Invoices/Index.vue',
    'acme-billing::Invoices\\Index', 'acme-billing::Invoices::Index', 'acme-billing::Index?foo',
])->throws(InvalidArgumentException::class);

it('rejects file symlinks escaping package roots', function () {
    $outside = $this->writeFile($this->sandbox.'/outside.vue', 'outside');
    mkdir($this->sandbox.'/linked-package');
    symlink($outside, $this->sandbox.'/linked-package/Index.vue');
    Satchel::pages('linked', $this->sandbox.'/linked-package');

    $this->resolver()->resolve('linked::Index');
})->throws(RuntimeException::class, 'not a safe page');

it('rejects namespace symlinks escaping the override root', function () {
    $this->writeFile($this->sandbox.'/outside/Invoices/Index.vue', 'outside');
    mkdir($this->sandbox.'/resources/js/Pages/vendor', 0777, true);
    symlink($this->sandbox.'/outside', $this->sandbox.'/resources/js/Pages/vendor/acme-billing');

    $this->resolver()->resolve('acme-billing::Invoices/Index');
})->throws(RuntimeException::class, 'escapes its page directory');

it('enumerates nested pages once and excludes unrelated files', function () {
    expect(array_map(fn ($page) => $page->component(), $this->resolver()->all()))->toBe([
        'acme-billing::Dashboard', 'acme-billing::Invoices/Index', 'acme-billing::Invoices/Show',
    ]);
});

it('detects byte-level content drift against the current package version', function () {
    $source = $this->packageRoot().'/Invoices/Index.vue';
    $override = $this->writeOverride('Invoices/Index.vue', file_get_contents($source));
    expect($this->resolver()->resolve('acme-billing::Invoices/Index')->isDrifted())->toBeFalse();

    file_put_contents($override, 'app customization');
    expect($this->resolver()->resolve('acme-billing::Invoices/Index')->isDrifted())->toBeTrue();
});

it('notices package changes after an identical page has been copied', function () {
    $package = $this->writeFile($this->sandbox.'/mutable/Index.vue', 'original');
    Satchel::pages('mutable', dirname($package));
    $this->writeOverride('Index.vue', 'original', 'mutable');
    expect($this->resolver()->resolve('mutable::Index')->isDrifted())->toBeFalse();

    file_put_contents($package, 'upstream update');
    expect($this->resolver()->resolve('mutable::Index')->isDrifted())->toBeTrue();
});
