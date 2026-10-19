<?php

namespace Dgtlss\Satchel\Commands;

use Dgtlss\Satchel\PagePublisher;
use Dgtlss\Satchel\PageResolver;
use Illuminate\Console\Command;
use InvalidArgumentException;
use RuntimeException;

final class PublishCommand extends Command
{
    protected $signature = 'satchel:publish {page? : namespace::Folder/Page} {--all : Publish every package page} {--force : Replace existing overrides, including other extensions}';

    protected $description = 'Copy package pages into the app override directory';

    public function handle(PageResolver $resolver, PagePublisher $publisher): int
    {
        $component = $this->argument('page');
        $all = (bool) $this->option('all');

        if ((! is_string($component) && ! $all) || (is_string($component) && $all)) {
            $this->components->error('Specify one namespace::Page or --all.');

            return self::INVALID;
        }

        try {
            $pages = $all
                ? array_filter($resolver->all(), fn ($page): bool => $page->packagePath !== null)
                : [$resolver->resolve((string) $component)];

            foreach ($pages as $page) {
                if ($publisher->publish($page, (bool) $this->option('force'))) {
                    $this->components->info('Published '.$page->component());
                } else {
                    $this->components->warn('Skipped '.$page->component().' (override exists; use --force to replace).');
                }
            }

            if ($pages === []) {
                $this->components->info('No package pages to publish.');
            }
        } catch (InvalidArgumentException|RuntimeException $exception) {
            $this->components->error($exception->getMessage());

            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
