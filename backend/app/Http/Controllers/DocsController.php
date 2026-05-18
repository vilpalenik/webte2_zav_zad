<?php

namespace App\Http\Controllers;

class DocsController extends Controller
{
    public function openapi()
    {
        $spec = [
            'openapi' => '3.0.3',
            'info'    => [
                'title'       => 'CAS & Simulations API',
                'version'     => '1.0.0',
                'description' => 'API pre Octave webovú konzolu a fyzikálne simulácie.',
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
                        'summary'     => 'Spustí príkaz v Octave',
                        'description' => 'Vykoná zadaný Octave príkaz v kontexte danej relácie (zachovanie premenných).',
                        'requestBody' => [
                            'required' => true,
                            'content'  => ['application/json' => ['schema' => ['type' => 'object', 'required' => ['command', 'session_id'], 'properties' => ['command' => ['type' => 'string', 'maxLength' => 10000], 'session_id' => ['type' => 'string']]]]],
                        ],
                        'responses' => [
                            '200' => ['description' => 'Príkaz úspešne vykonaný', 'content' => ['application/json' => ['schema' => ['type' => 'object', 'properties' => ['status' => ['type' => 'string'], 'output' => ['type' => 'string']]]]]],
                            '401' => ['description' => 'Nesprávny alebo chýbajúci API kľúč'],
                            '422' => ['description' => 'Chyba v syntaxi Octave'],
                        ],
                    ],
                ],
                '/api/cas/clear' => [
                    'post' => [
                        'summary'     => 'Vymaže pamäť relácie',
                        'description' => 'Resetuje históriu príkazov pre danú reláciu (premenné sa zabudnú).',
                        'requestBody' => [
                            'required' => true,
                            'content'  => ['application/json' => ['schema' => ['type' => 'object', 'required' => ['session_id'], 'properties' => ['session_id' => ['type' => 'string']]]]],
                        ],
                        'responses' => [
                            '200' => ['description' => 'Pamäť vymazaná'],
                            '401' => ['description' => 'Nesprávny alebo chýbajúci API kľúč'],
                        ],
                    ],
                ],
                '/api/cas/export' => [
                    'get' => [
                        'summary'     => 'Export logov do CSV',
                        'description' => 'Stiahne všetky záznamy Octave príkazov ako CSV súbor s UTF-8 BOM (kompatibilné s Excelom).',
                        'responses'   => [
                            '200' => ['description' => 'CSV súbor', 'content' => ['text/csv' => ['schema' => ['type' => 'string', 'format' => 'binary']]]],
                            '401' => ['description' => 'Nesprávny alebo chýbajúci API kľúč'],
                        ],
                    ],
                ],
                '/api/simulation/run' => [
                    'post' => [
                        'summary'     => 'Spustí fyzikálnu simuláciu',
                        'description' => 'Vypočíta časový priebeh simulácie (kyvadlo alebo gulička) pomocou LQR regulátora v Octave a vráti dáta pre animáciu.',
                        'requestBody' => [
                            'required' => true,
                            'content'  => ['application/json' => ['schema' => ['type' => 'object', 'required' => ['type', 'r1', 'r2'], 'properties' => ['type' => ['type' => 'string', 'enum' => ['pendulum', 'ball-beam']], 'r1' => ['type' => 'number', 'description' => 'Cieľová pozícia (1. beh)'], 'r2' => ['type' => 'number', 'description' => 'Cieľová pozícia (2. beh)']]]]],
                        ],
                        'responses' => [
                            '200' => ['description' => 'Časové rady pre animáciu a graf'],
                            '401' => ['description' => 'Nesprávny alebo chýbajúci API kľúč'],
                            '500' => ['description' => 'Simulácia zlyhala'],
                        ],
                    ],
                ],
                '/api/animation/log' => [
                    'post' => [
                        'summary'     => 'Zaloguje spustenie animácie',
                        'description' => 'Zaznamená spustenie animácie vrátane geolokácie používateľa. Platí 10-minútový cooldown na token+typ.',
                        'security'    => [],
                        'requestBody' => [
                            'required' => true,
                            'content'  => ['application/json' => ['schema' => ['type' => 'object', 'required' => ['type', 'token'], 'properties' => ['type' => ['type' => 'string', 'enum' => ['pendulum', 'ball-beam']], 'token' => ['type' => 'string', 'description' => 'Anonymný token používateľa z cookie user_token']]]]],
                        ],
                        'responses' => [
                            '200' => ['description' => 'Log zaznamenaný alebo preskočený (cooldown)'],
                        ],
                    ],
                ],
                '/api/animation/stats' => [
                    'get' => [
                        'summary'     => 'Štatistiky animácií',
                        'description' => 'Vráti počet spustení a poslednú lokalitu pre každý typ animácie.',
                        'security'    => [],
                        'responses'   => ['200' => ['description' => 'Agregované štatistiky']],
                    ],
                ],
                '/api/animation/detail/{type}' => [
                    'get' => [
                        'summary'     => 'Detail logov animácie',
                        'description' => 'Vráti kompletný zoznam spustení pre daný typ animácie s časovou pečiatkou a geolokáciou.',
                        'security'    => [],
                        'parameters'  => [['name' => 'type', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'string', 'enum' => ['pendulum', 'ball-beam']]]],
                        'responses'   => ['200' => ['description' => 'Zoznam záznamov']],
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
