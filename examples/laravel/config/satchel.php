<?php

return [
    'extensions' => [match (env('SATCHEL_FRAMEWORK', 'vue')) {
        'vue' => 'vue',
        'react' => 'tsx',
        'svelte' => 'svelte',
        default => throw new InvalidArgumentException('SATCHEL_FRAMEWORK must be vue, react, or svelte.'),
    }],
    'override_path' => resource_path(match (env('SATCHEL_FRAMEWORK', 'vue')) {
        'vue' => 'js',
        'react' => 'react',
        'svelte' => 'svelte',
    }.'/Pages/vendor'),
];
