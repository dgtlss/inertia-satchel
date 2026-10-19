<?php

namespace Dgtlss\Satchel;

use Illuminate\Contracts\Config\Repository;
use InvalidArgumentException;
use LogicException;

final class Satchel
{
    /** @var array<string, RegisteredNamespace> */
    private array $namespaces = [];

    public function __construct(private readonly Repository $config) {}

    public function pages(string $namespace, string $path): void
    {
        if (! preg_match('/\A[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*\z/', $namespace)) {
            throw new InvalidArgumentException('Satchel namespaces must be lowercase slugs, e.g. [acme-billing].');
        }

        if (isset($this->namespaces[$namespace])) {
            throw new LogicException("Satchel namespace [{$namespace}] is already registered.");
        }

        $realPath = realpath($path);

        if ($realPath === false || ! is_dir($realPath) || ! is_readable($realPath)) {
            throw new InvalidArgumentException("Satchel page path [{$path}] must be an existing, readable directory.");
        }

        $this->namespaces[$namespace] = new RegisteredNamespace($namespace, $realPath, $this->extensions());
    }

    /** @return array<string, RegisteredNamespace> */
    public function namespaces(): array
    {
        $namespaces = $this->namespaces;
        ksort($namespaces);

        return $namespaces;
    }

    public function namespace(string $namespace): RegisteredNamespace
    {
        return $this->namespaces[$namespace]
            ?? throw new InvalidArgumentException("Satchel namespace [{$namespace}] is not registered.");
    }

    /** @return list<non-empty-string> */
    private function extensions(): array
    {
        $extensions = $this->config->get('satchel.extensions');

        if (! is_array($extensions) || $extensions === [] || ! array_is_list($extensions)) {
            throw new InvalidArgumentException('satchel.extensions must be a non-empty list of extensions.');
        }

        foreach ($extensions as $extension) {
            if (! is_string($extension) || ! preg_match('/\A[a-z][a-z0-9]*\z/', $extension)) {
                throw new InvalidArgumentException('Satchel extensions must be lowercase suffixes without dots.');
            }
        }

        return array_values(array_unique($extensions));
    }

    public function overridePath(): string
    {
        $path = $this->config->get('satchel.override_path');

        if (! is_string($path) || ! self::isAbsolutePath($path) || preg_match('~(?:^|[/\\\\])\.\.(?:[/\\\\]|$)~', $path)) {
            throw new InvalidArgumentException('satchel.override_path must be an absolute path without traversal segments.');
        }

        return rtrim($path, '/\\');
    }

    public static function isAbsolutePath(string $path): bool
    {
        return str_starts_with($path, '/') || preg_match('~\A[A-Za-z]:[/\\\\]~', $path) === 1;
    }
}
