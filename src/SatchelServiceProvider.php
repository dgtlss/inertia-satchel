<?php

namespace Dgtlss\Satchel;

use Dgtlss\Satchel\Commands\ListCommand;
use Dgtlss\Satchel\Commands\ManifestCommand;
use Dgtlss\Satchel\Commands\PublishCommand;
use Dgtlss\Satchel\Inertia\SatchelResponseFactory;
use Dgtlss\Satchel\Inertia\SatchelViewFinder;
use Illuminate\Console\Events\CommandFinished;
use Illuminate\Contracts\Events\Dispatcher;
use Illuminate\Foundation\PackageManifest;
use Illuminate\View\ViewFinderInterface;
use Inertia\ResponseFactory;
use Inertia\ServiceProvider;
use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;

final class SatchelServiceProvider extends PackageServiceProvider
{
    public function configurePackage(Package $package): void
    {
        $package->name('satchel')
            ->hasConfigFile()
            ->hasCommands([ManifestCommand::class, ListCommand::class, PublishCommand::class]);
    }

    public function packageRegistered(): void
    {
        // Register the dependency first regardless of Composer provider ordering.
        $this->app->register(ServiceProvider::class);
        $this->app->singleton(Satchel::class);
        $this->app->singleton(PageResolver::class);
        $this->app->singleton(ResponseFactory::class, SatchelResponseFactory::class);
        $this->app->extend('inertia.view-finder', fn (ViewFinderInterface $finder): SatchelViewFinder => new SatchelViewFinder(
            $finder, $this->app->make(PageResolver::class),
        ));
    }

    public function packageBooted(): void
    {
        $this->app->make(Dispatcher::class)->listen(CommandFinished::class, function (CommandFinished $event): void {
            if ($event->command !== 'package:discover' || $event->exitCode !== 0) {
                return;
            }

            // A just-installed provider was absent when this process booted.
            // Registering it now also boots it, because Laravel is already booted.
            foreach ($this->app->make(PackageManifest::class)->providers() as $provider) {
                $this->app->register($provider);
            }

            $path = $this->app->make(Manifest::class)->write();
            $event->output->writeln("<info>Satchel manifest written to {$path}</info>");
        });
    }
}
