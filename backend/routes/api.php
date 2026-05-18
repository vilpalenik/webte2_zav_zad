<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CasController;

// Tieto trasy budú automaticky začínať ako /api/...
Route::post('/cas/execute', [CasController::class, 'execute']);
Route::post('/cas/clear', [CasController::class, 'clearSession']);
Route::get('/cas/export', [CasController::class, 'exportCsv']);
