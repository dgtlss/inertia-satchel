<?php

namespace Dgtlss\Satchel\Facades;

use Dgtlss\Satchel\RegisteredNamespace;
use Illuminate\Support\Facades\Facade;

/**
 * @method static void pages(string $namespace, string $path)
 * @method static array<string, RegisteredNamespace> namespaces()
 * @method static RegisteredNamespace namespace(string $namespace)
 * @method static string overridePath()
 *
 * @see \Dgtlss\Satchel\Satchel
 */
final class Satchel extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return \Dgtlss\Satchel\Satchel::class;
    }
}
