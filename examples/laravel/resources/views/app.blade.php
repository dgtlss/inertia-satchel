<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        @if (config('example.framework') === 'react')
            @viteReactRefresh
        @endif
        @vite(['resources/css/app.css', 'resources/'.config('example.directory').'/app.'.(config('example.framework') === 'react' ? 'tsx' : 'ts')])
        @inertiaHead
    </head>
    <body>@inertia</body>
</html>
