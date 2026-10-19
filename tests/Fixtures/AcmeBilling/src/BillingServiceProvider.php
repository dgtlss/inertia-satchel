<?php

namespace Acme\Billing;

use Dgtlss\Satchel\Facades\Satchel;
use Illuminate\Support\ServiceProvider;

class BillingServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Satchel::pages('acme-billing', __DIR__.'/../resources/js/Pages');
    }
}
