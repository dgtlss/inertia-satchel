<?php

namespace Dgtlss\Satchel\Tests\Fixtures;

use Dgtlss\Satchel\Facades\Satchel;
use Illuminate\Support\ServiceProvider;

class LatePagesServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Satchel::pages('late-package', __DIR__.'/AcmeBilling/resources/js/Pages');
    }
}
