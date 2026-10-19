<?php

namespace Dgtlss\Satchel\Tests;

use Acme\Billing\BillingServiceProvider;
use Dgtlss\Satchel\PageResolver;
use Dgtlss\Satchel\SatchelServiceProvider;
use Illuminate\Filesystem\Filesystem;
use Orchestra\Testbench\TestCase as Orchestra;

abstract class TestCase extends Orchestra
{
    public string $sandbox;

    protected function setUp(): void
    {
        $this->sandbox = sys_get_temp_dir().'/satchel-'.bin2hex(random_bytes(8));
        mkdir($this->sandbox, 0777, true);

        parent::setUp();
    }

    protected function tearDown(): void
    {
        try {
            parent::tearDown();
        } finally {
            (new Filesystem)->deleteDirectory($this->sandbox);
        }
    }

    protected function getPackageProviders($app): array
    {
        return [SatchelServiceProvider::class, BillingServiceProvider::class];
    }

    protected function defineEnvironment($app): void
    {
        $app['config']->set('satchel.override_path', $this->sandbox.'/resources/js/Pages/vendor');
        $app['config']->set('satchel.manifest_path', $this->sandbox.'/bootstrap/cache/satchel.json');
        $app['config']->set('inertia.pages.paths', [$this->sandbox.'/resources/js/Pages']);
        $app['config']->set('inertia.ssr.enabled', false);
        $app['config']->set('view.paths', [__DIR__.'/Fixtures/views']);
        $app['config']->set('view.compiled', $this->sandbox.'/compiled-views');
        mkdir($this->sandbox.'/compiled-views');
    }

    public function resolver(): PageResolver
    {
        return $this->app->make(PageResolver::class);
    }

    public function writeOverride(string $page, string $content, string $namespace = 'acme-billing'): string
    {
        return $this->writeFile($this->sandbox.'/resources/js/Pages/vendor/'.$namespace.'/'.$page, $content);
    }

    public function writeFile(string $path, string $content): string
    {
        (new Filesystem)->ensureDirectoryExists(dirname($path));
        file_put_contents($path, $content);

        return $path;
    }

    public function packageRoot(): string
    {
        return realpath(__DIR__.'/Fixtures/AcmeBilling/resources/js/Pages');
    }
}
