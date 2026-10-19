<?php

namespace Dgtlss\Satchel\Commands;

use Dgtlss\Satchel\Manifest;
use Illuminate\Console\Command;

final class ManifestCommand extends Command
{
    protected $signature = 'satchel:manifest';

    protected $description = 'Write the Satchel page namespace manifest for Vite';

    public function handle(Manifest $manifest): int
    {
        $this->components->info('Satchel manifest written to '.$manifest->write());

        return self::SUCCESS;
    }
}
