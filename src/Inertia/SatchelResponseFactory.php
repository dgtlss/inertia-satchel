<?php

namespace Dgtlss\Satchel\Inertia;

use BackedEnum;
use Dgtlss\Satchel\PageResolver;
use Inertia\Response;
use Inertia\ResponseFactory;
use UnitEnum;

/** Preserve Inertia's rendering behavior while validating namespaced pages. */
final class SatchelResponseFactory extends ResponseFactory
{
    public function __construct(private readonly PageResolver $pages) {}

    public function render($component, $props = []): Response
    {
        $name = match (true) {
            $component instanceof BackedEnum => $component->value,
            $component instanceof UnitEnum => $component->name,
            default => $component,
        };

        if (is_string($name) && str_contains($name, '::')) {
            $component = $this->pages->resolve($name)->component();
        }

        return parent::render($component, $props);
    }
}
