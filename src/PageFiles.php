<?php

namespace Dgtlss\Satchel;

use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use RuntimeException;
use SplFileInfo;

final class PageFiles
{
    /** @param list<string> $extensions */
    public function find(string $root, string $page, array $extensions): ?string
    {
        if (! is_dir($root)) {
            return null;
        }

        foreach ($extensions as $extension) {
            $candidate = $this->target($root, $page.'.'.$extension);

            if (is_file($candidate) && is_readable($candidate)) {
                return $candidate;
            }
        }

        return null;
    }

    /**
     * Return safe page names, ignoring unrelated assets and directory symlinks.
     *
     * @param  list<string>  $extensions
     * @return list<string>
     */
    public function pages(string $root, array $extensions): array
    {
        if (! is_dir($root)) {
            return [];
        }

        $root = $this->canonicalDirectory($root);
        $pages = [];
        $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, RecursiveDirectoryIterator::SKIP_DOTS));

        /** @var SplFileInfo $file */
        foreach ($files as $file) {
            if (! $file->isFile() || ! in_array($file->getExtension(), $extensions, true)) {
                continue;
            }

            $relative = substr($file->getPathname(), strlen($root) + 1);
            $page = str_replace(DIRECTORY_SEPARATOR, '/', substr($relative, 0, -strlen($file->getExtension()) - 1));

            if (PageResolver::isValidPage($page)) {
                $this->target($root, $relative);
                $pages[$page] = $page;
            }
        }

        sort($pages);

        return $pages;
    }

    /** Resolve existing ancestors and reject symlinks that escape the declared root. */
    public function target(string $root, string $relative, bool $writing = false): string
    {
        $root = $this->canonicalDirectory($root);
        $candidate = $root.DIRECTORY_SEPARATOR.$relative;
        $parent = $this->canonicalDirectory(dirname($candidate));

        if ($writing) {
            $current = $root;

            foreach (explode('/', str_replace('\\', '/', $relative)) as $segment) {
                $current .= DIRECTORY_SEPARATOR.$segment;

                if (is_link($current)) {
                    throw new RuntimeException("Satchel will not publish through a symlink [{$current}]. Remove the override symlink first.");
                }
            }
        }

        if (! $this->within($root, $parent)) {
            throw new RuntimeException("Satchel path [{$candidate}] escapes its page directory.");
        }

        if (file_exists($candidate) || is_link($candidate)) {
            $real = realpath($candidate);

            if ($real === false || ! $this->within($root, $real) || ! is_file($real)) {
                throw new RuntimeException("Satchel path [{$candidate}] is not a safe page file.");
            }
        }

        return $candidate;
    }

    private function within(string $root, string $path): bool
    {
        return $path === $root || str_starts_with($path, $root.DIRECTORY_SEPARATOR);
    }

    private function canonicalDirectory(string $directory): string
    {
        $missing = [];
        $current = $directory;

        while (! file_exists($current) && ! is_link($current)) {
            $parent = dirname($current);

            if ($current === $parent) {
                throw new RuntimeException("Cannot resolve Satchel directory [{$directory}].");
            }

            array_unshift($missing, basename($current));
            $current = $parent;
        }

        $real = realpath($current);

        if ($real === false || ! is_dir($real)) {
            throw new RuntimeException("Satchel directory [{$current}] is not readable.");
        }

        return rtrim($real, '/\\').($missing === [] ? '' : DIRECTORY_SEPARATOR.implode(DIRECTORY_SEPARATOR, $missing));
    }

    public function hash(string $path): string
    {
        $hash = hash_file('sha256', $path);

        if ($hash === false) {
            throw new RuntimeException("Cannot hash Satchel page [{$path}].");
        }

        return $hash;
    }
}
