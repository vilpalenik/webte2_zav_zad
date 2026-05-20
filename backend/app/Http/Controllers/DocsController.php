<?php

namespace App\Http\Controllers;

class DocsController extends Controller
{
    public function openapi(\Illuminate\Http\Request $request)
    {
        $en = $request->query('lang') === 'en';

        $t = [
            'api_desc'        => $en ? 'API for Octave web console and physics simulations.'
                                     : 'API pre Octave webovú konzolu a fyzikálne simulácie.',
            'exec_sum'        => $en ? 'Execute an Octave command'         : 'Spustí príkaz v Octave',
            'exec_desc'       => $en ? 'Runs the given Octave command in the context of the session (variables are preserved).'
                                     : 'Vykoná zadaný Octave príkaz v kontexte danej relácie (zachovanie premenných).',
            'exec_200'        => $en ? 'Command executed successfully'     : 'Príkaz úspešne vykonaný',
            'exec_422'        => $en ? 'Octave syntax error'               : 'Chyba v syntaxi Octave',
            'clear_sum'       => $en ? 'Clear session memory'              : 'Vymaže pamäť relácie',
            'clear_desc'      => $en ? 'Resets the command history for the session (variables are forgotten).'
                                     : 'Resetuje históriu príkazov pre danú reláciu (premenné sa zabudnú).',
            'clear_200'       => $en ? 'Memory cleared'                    : 'Pamäť vymazaná',
            'export_sum'      => $en ? 'Export logs to CSV'                : 'Export logov do CSV',
            'export_desc'     => $en ? 'Downloads all Octave command records as a CSV file with UTF-8 BOM (Excel compatible).'
                                     : 'Stiahne všetky záznamy Octave príkazov ako CSV súbor s UTF-8 BOM (kompatibilné s Excelom).',
            'export_200'      => $en ? 'CSV file'                          : 'CSV súbor',
            'sim_sum'         => $en ? 'Run physics simulation'            : 'Spustí fyzikálnu simuláciu',
            'sim_desc'        => $en ? 'Computes the time response of a simulation (pendulum or ball-beam) using an LQR controller in Octave and returns data for animation.'
                                     : 'Vypočíta časový priebeh simulácie (kyvadlo alebo gulička) pomocou LQR regulátora v Octave a vráti dáta pre animáciu.',
            'sim_r1'          => $en ? 'Target position (run 1)'           : 'Cieľová pozícia (1. beh)',
            'sim_r2'          => $en ? 'Target position (run 2)'           : 'Cieľová pozícia (2. beh)',
            'sim_200'         => $en ? 'Time series for animation and graph' : 'Časové rady pre animáciu a graf',
            'sim_500'         => $en ? 'Simulation failed'                 : 'Simulácia zlyhala',
            'log_sum'         => $en ? 'Log animation launch'              : 'Zaloguje spustenie animácie',
            'log_desc'        => $en ? 'Records an animation launch including user geolocation. A 10-minute cooldown applies per token+type.'
                                     : 'Zaznamená spustenie animácie vrátane geolokácie používateľa. Platí 10-minútový cooldown na token+typ.',
            'log_token'       => $en ? 'Anonymous user token from cookie user_token'
                                     : 'Anonymný token používateľa z cookie user_token',
            'log_200'         => $en ? 'Logged or skipped (cooldown)'      : 'Log zaznamenaný alebo preskočený (cooldown)',
            'stats_sum'       => $en ? 'Animation statistics'              : 'Štatistiky animácií',
            'stats_desc'      => $en ? 'Returns the run count and last location for each animation type.'
                                     : 'Vráti počet spustení a poslednú lokalitu pre každý typ animácie.',
            'stats_200'       => $en ? 'Aggregated statistics'             : 'Agregované štatistiky',
            'detail_sum'      => $en ? 'Animation log detail'              : 'Detail logov animácie',
            'detail_desc'     => $en ? 'Returns the full list of runs for the given animation type with timestamps and geolocation.'
                                     : 'Vráti kompletný zoznam spustení pre daný typ animácie s časovou pečiatkou a geolokáciou.',
            'detail_200'      => $en ? 'List of records'                   : 'Zoznam záznamov',
            'unauthorized'    => $en ? 'Invalid or missing API key'        : 'Nesprávny alebo chýbajúci API kľúč',
        ];

        $spec = [
            'openapi' => '3.0.3',
            'info'    => [
                'title'       => 'CAS & Simulations API',
                'version'     => '1.0.0',
                'description' => $t['api_desc'],
            ],
            'components' => [
                'securitySchemes' => [
                    'ApiKeyAuth' => ['type' => 'apiKey', 'in' => 'header', 'name' => 'X-API-KEY'],
                ],
            ],
            'security' => [['ApiKeyAuth' => []]],
            'paths'    => [
                '/api/cas/execute' => [
                    'post' => [
                        'summary'     => $t['exec_sum'],
                        'description' => $t['exec_desc'],
                        'requestBody' => [
                            'required' => true,
                            'content'  => ['application/json' => ['schema' => ['type' => 'object', 'required' => ['command', 'session_id'], 'properties' => ['command' => ['type' => 'string', 'maxLength' => 10000], 'session_id' => ['type' => 'string']]]]],
                        ],
                        'responses' => [
                            '200' => ['description' => $t['exec_200'], 'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['status' => ['type' => 'string'], 'output' => ['type' => 'string']]]]]],
                            '401' => ['description' => $t['unauthorized']],
                            '422' => ['description' => $t['exec_422']],
                        ],
                    ],
                ],
                '/api/cas/clear' => [
                    'post' => [
                        'summary'     => $t['clear_sum'],
                        'description' => $t['clear_desc'],
                        'requestBody' => [
                            'required' => true,
                            'content'  => ['application/json' => ['schema' => ['type' => 'object', 'required' => ['session_id'], 'properties' => ['session_id' => ['type' => 'string']]]]],
                        ],
                        'responses' => [
                            '200' => ['description' => $t['clear_200']],
                            '401' => ['description' => $t['unauthorized']],
                        ],
                    ],
                ],
                '/api/cas/export' => [
                    'get' => [
                        'summary'     => $t['export_sum'],
                        'description' => $t['export_desc'],
                        'responses'   => [
                            '200' => ['description' => $t['export_200'], 'content' => ['text/csv' => ['schema' => ['type' => 'string', 'format' => 'binary']]]],
                            '401' => ['description' => $t['unauthorized']],
                        ],
                    ],
                ],
                '/api/simulation/run' => [
                    'post' => [
                        'summary'     => $t['sim_sum'],
                        'description' => $t['sim_desc'],
                        'requestBody' => [
                            'required' => true,
                            'content'  => ['application/json' => ['schema' => ['type' => 'object', 'required' => ['type', 'r1', 'r2'], 'properties' => ['type' => ['type' => 'string', 'enum' => ['pendulum', 'ball-beam']], 'r1' => ['type' => 'number', 'description' => $t['sim_r1']], 'r2' => ['type' => 'number', 'description' => $t['sim_r2']]]]]],
                        ],
                        'responses' => [
                            '200' => ['description' => $t['sim_200']],
                            '401' => ['description' => $t['unauthorized']],
                            '500' => ['description' => $t['sim_500']],
                        ],
                    ],
                ],
                '/api/animation/log' => [
                    'post' => [
                        'summary'     => $t['log_sum'],
                        'description' => $t['log_desc'],
                        'security'    => [],
                        'requestBody' => [
                            'required' => true,
                            'content'  => ['application/json' => ['schema' => ['type' => 'object', 'required' => ['type', 'token'], 'properties' => ['type' => ['type' => 'string', 'enum' => ['pendulum', 'ball-beam']], 'token' => ['type' => 'string', 'description' => $t['log_token']]]]]],
                        ],
                        'responses' => [
                            '200' => ['description' => $t['log_200']],
                        ],
                    ],
                ],
                '/api/animation/stats' => [
                    'get' => [
                        'summary'     => $t['stats_sum'],
                        'description' => $t['stats_desc'],
                        'security'    => [],
                        'responses'   => ['200' => ['description' => $t['stats_200']]],
                    ],
                ],
                '/api/animation/detail/{type}' => [
                    'get' => [
                        'summary'     => $t['detail_sum'],
                        'description' => $t['detail_desc'],
                        'security'    => [],
                        'parameters'  => [['name' => 'type', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'string', 'enum' => ['pendulum', 'ball-beam']]]],
                        'responses'   => ['200' => ['description' => $t['detail_200']]],
                    ],
                ],
            ],
        ];

        return response()->json($spec);
    }

    public function printPage()
    {
        $cooldown = env('ANIMATION_COOLDOWN_MINUTES', 10);
        $html = <<<HTML
        <!DOCTYPE html>
        <html lang="sk">
        <head>
          <meta charset="UTF-8">
          <title>CAS & Simulations API - Dokumentácia</title>
          <style>
            /* ── screen ── */
            body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 2rem 2rem 4rem; color: #222; }
            h1 { color: #282c34; border-bottom: 2px solid #61dafb; padding-bottom: .5rem; }
            h2 { color: #444; margin-top: 2rem; }
            .endpoint { border: 1px solid #ddd; border-radius: 6px; padding: 1rem; margin: 1rem 0; page-break-inside: avoid; }
            .method { display: inline-block; padding: 2px 10px; border-radius: 4px; font-weight: bold; font-size: .85rem; margin-right: .5rem; }
            .post { background: #49cc90; color: white; }
            .get  { background: #61affe; color: white; }
            .path { font-family: monospace; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: .75rem; font-size: .9rem; }
            th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
            th { background: #f5f5f5; }
            .auth-note { font-size: .8rem; color: #888; }
            .screen-footer { display: none; }

            /* ── print ── */
            @page {
              size: A4;
              margin: 2.5cm 2cm 3cm;
              @top-center {
                content: "CAS & Simulations API — Dokumentácia";
                font-family: Arial, sans-serif;
                font-size: 9pt;
                color: #555;
                border-bottom: 1px solid #ccc;
                padding-bottom: 4pt;
              }
              @bottom-center {
                content: "CAS & Simulations API — Dokumentácia    " counter(page) " / " counter(pages);
                font-family: Arial, sans-serif;
                font-size: 9pt;
                color: #555;
              }
            }
            @media print {
              body { padding: 0; max-width: 100%; }
              /* fallback fixed footer for browsers that ignore @page margin boxes */
              .screen-footer {
                display: block;
                position: fixed;
                bottom: 0; left: 0; right: 0;
                text-align: center;
                font-size: 9pt;
                color: #555;
                border-top: 1px solid #ccc;
                padding: 4pt 0;
                background: white;
              }
            }
          </style>
        </head>
        <body>
          <div class="screen-footer">CAS &amp; Simulations API — Dokumentácia</div>

          <h1>CAS &amp; Simulations API — Dokumentácia</h1>
          <p><strong>Verzia:</strong> 1.0.0 &nbsp;|&nbsp; <strong>Autentifikácia:</strong> Header <code>X-API-KEY</code> (pokiaľ nie je uvedené inak)</p>

          <h2>Octave konzola</h2>

          <div class="endpoint">
            <span class="method post">POST</span><span class="path">/api/cas/execute</span>
            <p>Vykoná Octave príkaz v kontexte relácie (premenné sa pamätajú 60 minút).</p>
            <table><tr><th>Parameter</th><th>Typ</th><th>Popis</th></tr>
              <tr><td>command</td><td>string</td><td>Octave príkaz (max 10 000 znakov)</td></tr>
              <tr><td>session_id</td><td>string</td><td>Identifikátor relácie</td></tr>
            </table>
          </div>

          <div class="endpoint">
            <span class="method post">POST</span><span class="path">/api/cas/clear</span>
            <p>Resetuje históriu príkazov pre reláciu.</p>
            <table><tr><th>Parameter</th><th>Typ</th><th>Popis</th></tr>
              <tr><td>session_id</td><td>string</td><td>Identifikátor relácie</td></tr>
            </table>
          </div>

          <div class="endpoint">
            <span class="method get">GET</span><span class="path">/api/cas/export</span>
            <p>Stiahne všetky záznamy príkazov ako CSV súbor (UTF-8 BOM, kompatibilné s Excelom).</p>
          </div>

          <h2>Fyzikálne simulácie</h2>

          <div class="endpoint">
            <span class="method post">POST</span><span class="path">/api/simulation/run</span>
            <p>Spustí LQR simuláciu v Octave a vráti časové rady pre animáciu a graf (dva behy). Voliteľné oneskorenie odpovede: <code>SIMULATION_DELAY_MS</code> v .env.</p>
            <table><tr><th>Parameter</th><th>Typ</th><th>Popis</th></tr>
              <tr><td>type</td><td>string</td><td><code>pendulum</code> alebo <code>ball-beam</code></td></tr>
              <tr><td>r1</td><td>number</td><td>Cieľová pozícia — 1. beh (−2 až 2)</td></tr>
              <tr><td>r2</td><td>number</td><td>Cieľová pozícia — 2. beh (−2 až 2)</td></tr>
            </table>
          </div>

          <h2>Štatistiky animácií</h2>

          <div class="endpoint">
            <span class="method post">POST</span><span class="path">/api/animation/log</span>
            <p class="auth-note">Nevyžaduje API kľúč. Cooldown: {$cooldown} minút na token + typ (konfigurovateľné cez <code>ANIMATION_COOLDOWN_MINUTES</code>).</p>
            <p>Zaznamená spustenie animácie s geolokáciou z IP adresy. Token je anonymný identifikátor z cookie.</p>
            <table><tr><th>Parameter</th><th>Typ</th><th>Popis</th></tr>
              <tr><td>type</td><td>string</td><td><code>pendulum</code> alebo <code>ball-beam</code></td></tr>
              <tr><td>token</td><td>string</td><td>Anonymný token používateľa (z cookie <code>user_token</code>)</td></tr>
            </table>
          </div>

          <div class="endpoint">
            <span class="method get">GET</span><span class="path">/api/animation/stats</span>
            <p class="auth-note">Nevyžaduje API kľúč.</p>
            <p>Vráti celkový počet spustení a poslednú lokalitu pre každý typ animácie.</p>
          </div>

          <div class="endpoint">
            <span class="method get">GET</span><span class="path">/api/animation/detail/{type}</span>
            <p class="auth-note">Nevyžaduje API kľúč.</p>
            <p>Vráti kompletný log spustení daného typu animácie (dátum, čas, token, mesto, štát).</p>
          </div>

          <h2>API dokumentácia</h2>

          <div class="endpoint">
            <span class="method get">GET</span><span class="path">/api/docs/openapi</span>
            <p class="auth-note">Nevyžaduje API kľúč.</p>
            <p>Vráti OpenAPI 3.0 špecifikáciu vo formáte JSON.</p>
          </div>

          <div class="endpoint">
            <span class="method get">GET</span><span class="path">/api/docs/print</span>
            <p class="auth-note">Nevyžaduje API kľúč.</p>
            <p>Vráti túto dokumentáciu ako HTML stránku optimalizovanú pre tlač / export do PDF.</p>
          </div>

          <script>window.onload = () => window.print();</script>
        </body>
        </html>
        HTML;

        return response($html)->header('Content-Type', 'text/html; charset=utf-8');
    }
}
