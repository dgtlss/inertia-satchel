<?php

namespace Dgtlss\Satchel;

final readonly class ResolvedPage
{
    public function __construct(
        public RegisteredNamespace $registration,
        public string $page,
        public string $path,
        public ?string $packagePath,
        public ?string $overridePath,
    ) {}

    public function component(): string
    {
        return $this->registration->namespace.'::'.$this->page;
    }

    public function isOverridden(): bool
    {
        return $this->overridePath !== null;
    }

    public function isDrifted(): bool
    {
        $files = new PageFiles;

        return $this->overridePath !== null && $this->packagePath !== null
            && $files->hash($this->overridePath) !== $files->hash($this->packagePath);
    }
}
