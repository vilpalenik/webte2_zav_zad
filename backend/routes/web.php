<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CasController;


Route::get('/', function () {
    return view('welcome');
});

Route::get('/test-octave', function () {
    // Jednoduchý matematický príkaz pre Octave (sčítanie matíc alebo čísel)
    // --eval spustí príkaz priamo v príkazovom riadku a ukončí Octave
    $command = 'octave --eval "disp(5 + 10)"';
    
    // Spustenie príkazu v operačnom systéme kontajnera
    exec($command, $output, $returnCode);

    if ($returnCode !== 0) {
        return response()->json([
            'status' => 'error',
            'message' => 'Nepodarilo sa spustiť Octave.'
        ], 500);
    }

    return response()->json([
        'status' => 'success',
        'command' => $command,
        'output' => $output // Malo by vrátiť [" 15"]
    ]);
});
