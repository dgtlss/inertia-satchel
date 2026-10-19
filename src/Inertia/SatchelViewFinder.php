<?php

namespace Dgtlss\Satchel\Inertia;

use Dgtlss\Satchel\PageResolver;
use Illuminate\View\ViewFinderInterface;

/** Also support Inertia's ensure_pages_exist and assertInertia()->component(). */
final class SatchelViewFinder implements ViewFinderInterface
{
    public function __construct(
        private readonly ViewFinderInterface $fallback,
        private readonly PageResolver $pages,
    ) {}

    public function find($view): string
    {
        return str_contains($view, '::')
            ? $this->pages->resolve($view)->path
            : $this->fallback->find($view);
    }

    public function addLocation($location): void
    {
        $this->fallback->addLocation($location);
    }

    /** @param string|list<string> $hints */
    public function addNamespace($namespace, $hints): void
    {
        $this->fallback->addNamespace($namespace, $hints);
    }

    /** @param string|list<string> $hints */
    public function prependNamespace($namespace, $hints): void
    {
        $this->fallback->prependNamespace($namespace, $hints);
    }

    /** @param string|list<string> $hints */
    public function replaceNamespace($namespace, $hints): void
    {
        $this->fallback->replaceNamespace($namespace, $hints);
    }

    public function addExtension($extension): void
    {
        $this->fallback->addExtension($extension);
    }

    public function flush(): void
    {
        $this->fallback->flush();
    }
}
