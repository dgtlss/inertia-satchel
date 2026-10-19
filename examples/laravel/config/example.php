<?php

$framework = env('SATCHEL_FRAMEWORK', 'vue');

return [
    'framework' => $framework,
    'directory' => match ($framework) {
        'vue' => 'js',
        'react' => 'react',
        'svelte' => 'svelte',
        default => throw new InvalidArgumentException('SATCHEL_FRAMEWORK must be vue, react, or svelte.'),
    },
];
