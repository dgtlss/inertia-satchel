<?php

return [
    // The first matching extension wins, after checking ALL app overrides first.
    'extensions' => ['vue', 'tsx', 'jsx', 'svelte', 'ts', 'js'],

    'override_path' => resource_path('js/Pages/vendor'),

    // Build-time input for the future Vite plugin; never send this to the browser.
    'manifest_path' => app()->bootstrapPath('cache/satchel.json'),
];
