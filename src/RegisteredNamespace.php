<?php

namespace Dgtlss\Satchel;

final readonly class RegisteredNamespace
{
    /** @param list<non-empty-string> $extensions */
    public function __construct(
        public string $namespace,
        public string $path,
        public array $extensions,
    ) {}
}
