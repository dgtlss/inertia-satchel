<?php

return [
    'ssr' => [
        'enabled' => (bool) env('INERTIA_SSR_ENABLED', false),
        'url' => env('INERTIA_SSR_URL', 'http://127.0.0.1:13714'),
        'bundle' => base_path('bootstrap/ssr/ssr.js'),
        'ensure_bundle_exists' => true,
        'throw_on_error' => (bool) env('INERTIA_SSR_THROW_ON_ERROR', false),
        'timeout' => 5,
    ],
];
