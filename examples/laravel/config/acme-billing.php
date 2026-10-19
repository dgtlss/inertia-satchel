<?php

$directory = match (env('SATCHEL_FRAMEWORK', 'vue')) {
    'vue' => 'js',
    'react' => 'react',
    'svelte' => 'svelte',
    default => throw new InvalidArgumentException('SATCHEL_FRAMEWORK must be vue, react, or svelte.'),
};

return [
    // The fixture ships one implementation per framework for this shared host.
    'pages_path' => base_path('vendor/acme/billing/resources/'.$directory.'/Pages'),
];
