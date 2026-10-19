<?php

namespace Dgtlss\Satchel;

use Illuminate\Contracts\Config\Repository;
use Illuminate\Filesystem\Filesystem;
use InvalidArgumentException;

final class Manifest
{
    public function __construct(
        private readonly Satchel $satchel,
        private readonly Repository $config,
        private readonly Filesystem $files,
    ) {}

    /** @return array{version: int, override_path: string, namespaces: list<array{namespace: string, path: string, extensions: list<string>}>} */
    public function toArray(): array
    {
        return [
            'version' => 1,
            'override_path' => $this->portable($this->satchel->overridePath()),
            'namespaces' => array_values(array_map(fn (RegisteredNamespace $registration): array => [
                'namespace' => $registration->namespace,
                'path' => $this->portable($registration->path),
                'extensions' => $registration->extensions,
            ], $this->satchel->namespaces())),
        ];
    }

    public function write(): string
    {
        $path = $this->config->get('satchel.manifest_path');

        if (! is_string($path) || ! Satchel::isAbsolutePath($path)) {
            throw new InvalidArgumentException('satchel.manifest_path must be an absolute file path.');
        }

        $json = json_encode($this->toArray(), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR).PHP_EOL;
        $this->files->ensureDirectoryExists(dirname($path));
        // Atomic replacement prevents the Vite watcher from reading partial JSON.
        $this->files->replace($path, $json);

        return $path;
    }

    private function portable(string $path): string
    {
        return str_replace('\\', '/', $path);
    }
}
