<?php

namespace Dgtlss\Satchel\Commands;

use Dgtlss\Satchel\PageResolver;
use Illuminate\Console\Command;

final class ListCommand extends Command
{
    protected $signature = 'satchel:list';

    protected $description = 'List Satchel pages, package sources, overrides, and content drift';

    public function handle(PageResolver $resolver): int
    {
        $rows = [];

        foreach ($resolver->all() as $page) {
            $rows[] = [
                $page->component(),
                $page->packagePath ?? '—',
                $page->path,
                $page->isOverridden() ? 'yes' : 'no',
                $page->packagePath === null ? 'n/a' : ($page->isDrifted() ? 'yes' : 'no'),
            ];
        }

        if ($rows === []) {
            $this->components->info('No Satchel pages registered.');

            return self::SUCCESS;
        }

        $this->table(['Page', 'Package source', 'Resolved source', 'Overridden', 'Drifted'], $rows);

        return self::SUCCESS;
    }
}
