<?php

use Dgtlss\Satchel\Facades\Satchel;
use Dgtlss\Satchel\Manifest;
use Dgtlss\Satchel\Tests\Fixtures\LatePagesServiceProvider;
use Illuminate\Console\Events\CommandFinished;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Foundation\PackageManifest;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Event;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Output\BufferedOutput;

it('defines the versioned build-time manifest with absolute paths and ordered extensions', function () {
    expect(app(Manifest::class)->toArray())->toBe([
        'version' => 1,
        'override_path' => $this->sandbox.'/resources/js/Pages/vendor',
        'namespaces' => [[
            'namespace' => 'acme-billing',
            'path' => $this->packageRoot(),
            'extensions' => ['vue', 'tsx', 'jsx', 'svelte', 'ts', 'js'],
        ]],
    ]);
});

it('writes a deterministic manifest and safely regenerates it', function () {
    $path = config('satchel.manifest_path');
    expect(is_file($path))->toBeFalse();
    $this->artisan('satchel:manifest')->assertSuccessful();
    $first = file_get_contents($path);

    expect(json_decode($first, true, flags: JSON_THROW_ON_ERROR))->toBe(app(Manifest::class)->toArray());
    $this->artisan('satchel:manifest')->assertSuccessful();
    expect(file_get_contents($path))->toBe($first)
        ->and(glob(dirname($path).'/*'))->toBe([$path]);
});

it('supports a configurable manifest location and sorts namespaces', function () {
    config(['satchel.manifest_path' => $this->sandbox.'/custom directory/pages.json']);
    Satchel::pages('aaa-package', $this->packageRoot());
    $this->artisan('satchel:manifest')->assertSuccessful();
    $manifest = json_decode(file_get_contents(config('satchel.manifest_path')), true, flags: JSON_THROW_ON_ERROR);

    expect(array_column($manifest['namespaces'], 'namespace'))->toBe(['aaa-package', 'acme-billing']);
});

it('writes an empty namespace list as a JSON array', function () {
    $empty = new Dgtlss\Satchel\Satchel(app('config'));
    $manifest = new Manifest($empty, app('config'), app('files'));
    $path = $manifest->write();

    expect(json_decode(file_get_contents($path), true, flags: JSON_THROW_ON_ERROR)['namespaces'])->toBe([]);
});

it('regenerates after package discovery and includes newly discovered providers', function () {
    // Laravel disables command event routing during unit tests. Exercise the
    // real console lifecycle, including its CommandFinished event, explicitly.
    $kernel = app(Kernel::class);
    $kernel->rerouteSymfonyCommandEvents();
    $kernel->setArtisan(null);

    $packageManifest = Mockery::mock(PackageManifest::class);
    $packageManifest->manifest = [];
    $packageManifest->shouldReceive('build')->twice();
    $packageManifest->shouldReceive('providers')->andReturn([LatePagesServiceProvider::class]);
    $this->app->instance(PackageManifest::class, $packageManifest);

    expect(Satchel::namespaces())->not->toHaveKey('late-package');
    expect(Artisan::call('package:discover'))->toBe(0);

    $manifest = json_decode(file_get_contents(config('satchel.manifest_path')), true, flags: JSON_THROW_ON_ERROR);
    expect(array_column($manifest['namespaces'], 'namespace'))->toBe(['acme-billing', 'late-package']);
    expect(Artisan::call('package:discover'))->toBe(0);
});

it('does not write a manifest for unrelated or failed commands', function (string $command, int $exitCode) {
    Event::dispatch(new CommandFinished($command, new ArrayInput([]), new BufferedOutput, $exitCode));

    expect(is_file(config('satchel.manifest_path')))->toBeFalse();
})->with([['list', 0], ['package:discover', 1]]);

it('rejects a relative manifest location', function () {
    config(['satchel.manifest_path' => 'relative.json']);
    app(Manifest::class)->write();
})->throws(InvalidArgumentException::class, 'absolute file path');
