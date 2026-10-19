<?php

namespace Dgtlss\Satchel;

use Dgtlss\Satchel\Exceptions\PageNotFoundException;
use Illuminate\Filesystem\Filesystem;
use RuntimeException;

final class PagePublisher
{
    public function __construct(
        private readonly Satchel $satchel,
        private readonly PageFiles $pages,
        private readonly Filesystem $files,
    ) {}

    /** False means an existing override was preserved. */
    public function publish(ResolvedPage $page, bool $force = false): bool
    {
        $source = $page->packagePath;

        if ($source === null) {
            throw new PageNotFoundException("Satchel page [{$page->component()}] has no package source to publish.");
        }

        if ($page->isOverridden() && ! $force) {
            return false;
        }

        $relative = $page->registration->namespace.'/'.$page->page;
        $root = $this->satchel->overridePath();
        $target = $this->pages->target($root, $relative.'.'.pathinfo($source, PATHINFO_EXTENSION), writing: true);
        $variants = [];

        foreach ($page->registration->extensions as $extension) {
            $variant = $this->pages->target($root, $relative.'.'.$extension, writing: true);

            if (is_file($variant) && $variant !== $target) {
                $variants[] = $variant;
            }
        }

        if (realpath($source) === realpath($target)) {
            throw new RuntimeException('Satchel cannot publish a page over its own package source.');
        }

        $this->files->ensureDirectoryExists(dirname($target));
        // Atomic replacement also keeps watchers from reading partially copied pages.
        $this->files->replace($target, $this->files->get($source));

        if ($force && $variants !== [] && ! $this->files->delete($variants)) {
            throw new RuntimeException("Cannot remove alternate overrides of [{$page->component()}].");
        }

        return true;
    }
}
