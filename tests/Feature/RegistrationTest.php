<?php

use Dgtlss\Satchel\Facades\Satchel;

it('registers a package from its service provider and canonicalizes its path', function () {
    $registration = Satchel::namespace('acme-billing');

    expect($registration->namespace)->toBe('acme-billing')
        ->and($registration->path)->toBe($this->packageRoot())
        ->and($registration->extensions)->toBe(['vue', 'tsx', 'jsx', 'svelte', 'ts', 'js']);
});

it('rejects invalid namespaces', function (string $namespace) {
    Satchel::pages($namespace, $this->packageRoot());
})->with(['', 'Acme', '../acme', 'acme/billing', 'acme::billing', 'acme.billing', 'acme--billing', 'acme billing', '-acme', 'acme-'])
    ->throws(InvalidArgumentException::class);

it('rejects missing paths and files', function (string $path) {
    Satchel::pages('invalid-path', __DIR__.$path);
})->with(['/does-not-exist', '/RegistrationTest.php'])->throws(InvalidArgumentException::class);

it('rejects duplicate namespace ownership', function () {
    Satchel::pages('acme-billing', $this->packageRoot());
})->throws(LogicException::class, 'already registered');

it('rejects malformed extension configuration', function (mixed $extensions) {
    config(['satchel.extensions' => $extensions]);
    Satchel::pages('bad-config', $this->packageRoot());
})->with([[[]], 'vue', [['.vue']], [['Vue']], [['../vue']], [[12]], [['named' => 'vue']]])
    ->throws(InvalidArgumentException::class);

it('retains each registrations extension order and deduplicates suffixes', function () {
    config(['satchel.extensions' => ['jsx', 'vue', 'jsx']]);
    Satchel::pages('other-package', $this->packageRoot());

    expect(Satchel::namespace('other-package')->extensions)->toBe(['jsx', 'vue'])
        ->and(Satchel::namespace('acme-billing')->extensions[0])->toBe('vue');
});
