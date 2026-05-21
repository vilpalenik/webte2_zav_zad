<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CasController;
use App\Http\Controllers\SimulationController;
use App\Http\Controllers\AnimationController;
use App\Http\Controllers\DocsController;

Route::post('/cas/execute', [CasController::class, 'execute']);
Route::post('/cas/clear',   [CasController::class, 'clearSession']);
Route::get('/cas/export',   [CasController::class, 'exportCsv']);

Route::post('/simulation/run', [SimulationController::class, 'run']);

Route::post('/animation/log',          [AnimationController::class, 'log']);
Route::get('/animation/stats',         [AnimationController::class, 'stats']);
Route::get('/animation/detail/{type}', [AnimationController::class, 'detail']);

Route::get('/docs/openapi', [DocsController::class, 'openapi']);
Route::get('/docs/print',   [DocsController::class, 'printPage']);
Route::get('/docs/pdf',     [DocsController::class, 'pdf']);
