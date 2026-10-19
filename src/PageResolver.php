<?php

namespace Dgtlss\Satchel;

use Dgtlss\Satchel\Exceptions\PageNotFoundException;
use InvalidArgumentException;

final class PageResolver
{
    public function __construct(
        private readonly Satchel $satchel,
        private readonly PageFiles $files,
    ) {}

    public static function isValidPage(string $page): bool
    {
        return preg_match('~\A[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*\z~', $page) === 1;
    }

    public function resolve(string $component): ResolvedPage
    {
        $parts = explode('::', $component);

        if (count($parts) !== 2 || ! self::isValidPage($parts[1])) {
            throw new InvalidArgumentException("Invalid Satchel component [{$component}]. Use namespace::Folder/Page without an extension.");
        }

        [$namespace, $page] = $parts;
        $registration = $this->satchel->namespace($namespace);
        $packagePath = $this->files->find($registration->path, $page, $registration->extensions);
        $overridePath = $this->files->find($this->satchel->overridePath(), $namespace.'/'.$page, $registration->extensions);
        $path = $overridePath ?? $packagePath;

        if ($path === null) {
            throw new PageNotFoundException("Satchel page [{$component}] was not found in the app overrides or package directory.");
        }

        return new ResolvedPage($registration, $page, $path, $packagePath, $overridePath);
    }

    /** @return list<ResolvedPage> */
    public function all(): array
    {
        $pages = [];

        foreach ($this->satchel->namespaces() as $namespace => $registration) {
            // Scan from the declared override root so namespace symlinks cannot escape it.
            $overrideNames = array_filter(
                $this->files->pages($this->satchel->overridePath(), $registration->extensions),
                fn (string $page): bool => str_starts_with($page, $namespace.'/'),
            );
            $names = array_unique([
                ...$this->files->pages($registration->path, $registration->extensions),
                ...array_map(fn (string $page): string => substr($page, strlen($namespace) + 1), $overrideNames),
            ]);
            sort($names);

            foreach ($names as $name) {
                $pages[] = $this->resolve($namespace.'::'.$name);
            }
        }

        return $pages;
    }
}
