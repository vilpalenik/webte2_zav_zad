<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use App\Models\CasLog;
use Illuminate\Support\Facades\Response;

class CasController extends Controller
{
    private function checkAuth(Request $request)
    {
        $apiKey = $request->header('X-API-KEY');
        return $apiKey && $apiKey === env('CAS_API_KEY');
    }

    public function execute(Request $request)
    {
        // 1. Ochrana API
        if (!$this->checkAuth($request)) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 401);
        }

        $request->validate([
            'command' => 'required|string|max:10000',
            'session_id' => 'required|string'
        ]);

        $newCommand = trim($request->input('command'));
        $sessionId = $request->input('session_id');
        $cacheKey = "cas_history_" . $sessionId;

        $history = Cache::get($cacheKey, []);
        $allCommands = array_merge($history, [$newCommand]);
        $octaveInput = implode("; ", $allCommands);

        // Bezpečné ošetrenie príkazu pre terminál
        $finalOctaveCommand = sprintf('octave --eval "%s"', addcslashes($octaveInput, '"\\$`'));

        // Spustenie v Octave
        exec($finalOctaveCommand, $output, $returnCode);
        $isSuccess = ($returnCode === 0);
        $cleanOutput = implode("\n", $output);

        // 2. LOGOVANIE DO DATABÁZY (Splnenie bodu 8 zo zadania)
        CasLog::create([
            'session_id' => $sessionId,
            'command' => $newCommand,
            'output' => $cleanOutput,
            'is_success' => $isSuccess
        ]);

        if (!$isSuccess) {
            return response()->json([
                'status' => 'error',
                'message' => 'Chyba v syntaxi Octave.',
                'output' => $cleanOutput
            ], 422);
        }

        // Ak úspech, uložíme príkaz do pamäte relácie
        $history[] = $newCommand;
        Cache::put($cacheKey, $history, now()->addMinutes(60));

        return response()->json([
            'status' => 'success',
            'output' => $cleanOutput
        ]);
    }

    public function clearSession(Request $request)
    {
        if (!$this->checkAuth($request)) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 401);
        }

        $request->validate(['session_id' => 'required|string']);
        Cache::forget("cas_history_" . $request->input('session_id'));

        return response()->json(['status' => 'success', 'message' => 'Pamäť vymazaná.']);
    }

    // 3. EXPORT DO CSV (Splnenie bodu 9 zo zadania)
    public function exportCsv(Request $request)
    {
        if (!$this->checkAuth($request)) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 401);
        }

        $logs = CasLog::all();
        $csvFileName = 'cas_logs_' . date('Y-m-d_H-i-s') . '.csv';

        $headers = [
            "Content-type"        => "text/csv; charset=utf-8",
            "Content-Disposition" => "attachment; filename=$csvFileName",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        $callback = function() use($logs) {
            $file = fopen('php://output', 'w');
            // Pridanie BOM pre správne zobrazenie diakritiky v Exceli
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));
            
            // Hlavička CSV table
            fputcsv($file, ['ID', 'Relácia (Session ID)', 'Príkaz', 'Výstup', 'Úspešnosť', 'Dátum a Čas']);

            foreach ($logs as $log) {
                fputcsv($file, [
                    $log->id,
                    $log->session_id,
                    $log->command,
                    $log->output,
                    $log->is_success ? 'Áno' : 'Nie',
                    $log->created_at
                ]);
            }

            fclose($file);
        };

        return Response::stream($callback, 200, $headers);
    }
}
