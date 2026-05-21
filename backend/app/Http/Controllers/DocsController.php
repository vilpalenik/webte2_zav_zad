<?php

namespace App\Http\Controllers;

use Dompdf\Dompdf;
use Dompdf\Options;

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

    public function pdf(\Illuminate\Http\Request $request)
    {
        $en       = $request->query('lang') === 'en';
        $cooldown = env('ANIMATION_COOLDOWN_MINUTES', 10);
        $title    = 'CAS & Simulations API — Dokumentácia';

        $html = $this->buildPdfHtml($en, $cooldown);

        $options = new Options();
        $options->set('isHtml5ParserEnabled', true);
        $options->set('isRemoteEnabled', false);
        $options->set('defaultFont', 'DejaVu Sans');

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        // Add header and page numbers via canvas (runs on every page)
        $canvas      = $dompdf->getCanvas();
        $fontMetrics = $dompdf->getFontMetrics();
        $font        = $fontMetrics->get_font('DejaVu Sans', 'normal');
        $w           = $canvas->get_width();
        $h           = $canvas->get_height();

        $canvas->page_script(function ($pageNumber, $pageCount, $canvas) use ($font, $w, $h, $title) {
            // Header: document name + separator line
            $canvas->text(40, 14, $title, $font, 7, [0.3, 0.3, 0.3]);
            $canvas->line(40, 26, $w - 40, 26, [0.75, 0.75, 0.75], 0.5);
            // Footer: separator line + "page / total"
            $canvas->line(40, $h - 32, $w - 40, $h - 32, [0.75, 0.75, 0.75], 0.5);
            $label = "$pageNumber / $pageCount";
            $canvas->text($w / 2 - 14, $h - 22, $label, $font, 9, [0.2, 0.2, 0.2]);
        });

        $output = $dompdf->output();

        return response($output, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="api-documentation.pdf"',
            'Content-Length'      => strlen($output),
        ]);
    }

    private function buildPdfHtml(bool $en, int $cooldown): string
    {
        $h = fn(string $s) => htmlspecialchars($s, ENT_QUOTES);

        $endpoints = [
            ['POST', '/api/cas/execute',
                $en ? 'Execute an Octave command' : 'Spustí príkaz v Octave',
                $en ? 'Runs the Octave command in the session context (variables are preserved for 60 minutes).'
                    : 'Vykoná Octave príkaz v kontexte relácie (premenné sa uchovávajú 60 minút).',
                [['command','string', $en?'Octave command (max 10 000 chars)':'Octave príkaz (max 10 000 znakov)', true],
                 ['session_id','string', $en?'Session identifier':'Identifikátor relácie', true]],
                true],
            ['POST', '/api/cas/clear',
                $en ? 'Clear session memory' : 'Vymaže pamäť relácie',
                $en ? 'Resets the command history for the session (variables are forgotten).'
                    : 'Resetuje históriu príkazov pre reláciu (premenné sa zabudnú).',
                [['session_id','string', $en?'Session identifier':'Identifikátor relácie', true]],
                true],
            ['GET', '/api/cas/export',
                $en ? 'Export logs to CSV' : 'Export logov do CSV',
                $en ? 'Downloads all Octave command records as a UTF-8 BOM CSV file (Excel compatible).'
                    : 'Stiahne záznamy príkazov ako CSV súbor s UTF-8 BOM (kompatibilné s Excelom).',
                [], true],
            ['POST', '/api/simulation/run',
                $en ? 'Run physics simulation' : 'Spustí fyzikálnu simuláciu',
                $en ? 'Computes the LQR simulation (pendulum or ball-beam) and returns time-series data for animation.'
                    : 'Vypočíta LQR simuláciu (kyvadlo alebo gulička) a vráti časové rady pre animáciu.',
                [['type','string (pendulum | ball-beam)', $en?'Simulation type':'Typ simulácie', true],
                 ['r1','number', $en?'Target position run 1 (−2 to 2)':'Cieľová pozícia beh 1 (−2 až 2)', true],
                 ['r2','number', $en?'Target position run 2 (−2 to 2)':'Cieľová pozícia beh 2 (−2 až 2)', true]],
                true],
            ['POST', '/api/animation/log',
                $en ? 'Log animation launch' : 'Zaloguje spustenie animácie',
                $en ? "Records an animation launch with IP geolocation. Cooldown: {$cooldown} min per token+type."
                    : "Zaznamená spustenie animácie s geolokáciou. Cooldown: {$cooldown} min na token+typ.",
                [['type','string (pendulum | ball-beam)', $en?'Animation type':'Typ animácie', true],
                 ['token','string', $en?'Anonymous user token from cookie':'Anonymný token z cookie user_token', true]],
                false],
            ['GET', '/api/animation/stats',
                $en ? 'Animation statistics' : 'Štatistiky animácií',
                $en ? 'Returns run count and last location per animation type.'
                    : 'Vráti počet spustení a poslednú lokalitu pre každý typ animácie.',
                [], false],
            ['GET', '/api/animation/detail/{type}',
                $en ? 'Animation log detail' : 'Detail logov animácie',
                $en ? 'Returns the full run log for the given animation type (timestamp, city, country).'
                    : 'Vráti kompletný log spustení pre daný typ animácie (čas, mesto, štát).',
                [], false],
            ['GET', '/api/docs/openapi',
                $en ? 'OpenAPI specification' : 'OpenAPI špecifikácia',
                $en ? 'Returns the OpenAPI 3.0 spec as JSON. Accepts ?lang=sk|en.'
                    : 'Vráti OpenAPI 3.0 špecifikáciu ako JSON. Podporuje ?lang=sk|en.',
                [], false],
        ];

        $authLabel = $en ? 'No API key required.' : 'Nevyžaduje API kľúč.';
        $paramH    = $en ? 'Parameter' : 'Parameter';
        $typeH     = $en ? 'Type'      : 'Typ';
        $descH     = $en ? 'Description' : 'Popis';
        $reqH      = $en ? 'Required'  : 'Povinný';
        $authHeader= $en ? 'Authentication: header <b>X-API-KEY</b> required on all marked endpoints.'
                         : 'Autentifikácia: header <b>X-API-KEY</b> vyžadovaný na označených endpointoch.';

        $rows = '';
        foreach ($endpoints as [$method, $path, $summary, $desc, $params, $requiresAuth]) {
            $methodColor = $method === 'POST' ? '#49cc90' : '#61affe';
            $authNote    = $requiresAuth ? '' : "<p class='auth'>{$authLabel}</p>";
            $tableHtml   = '';
            if ($params) {
                $tableHtml .= "<table><tr><th>{$paramH}</th><th>{$typeH}</th><th>{$descH}</th><th>{$reqH}</th></tr>";
                foreach ($params as [$pName, $pType, $pDesc, $pReq]) {
                    $req = $pReq ? '✓' : '';
                    $tableHtml .= "<tr><td><code>{$h($pName)}</code></td><td>{$h($pType)}</td><td>{$h($pDesc)}</td><td>{$req}</td></tr>";
                }
                $tableHtml .= '</table>';
            }
            $rows .= <<<ROW
            <div class="ep">
              <div class="head">
                <span class="method" style="background:{$methodColor}">{$method}</span>
                <code class="path">{$h($path)}</code>
              </div>
              <p class="sum">{$h($summary)}</p>
              <p class="desc">{$h($desc)}</p>
              {$authNote}
              {$tableHtml}
            </div>
            ROW;
        }

        return <<<HTML
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @page { size: A4; margin: 45px 40px 50px 40px; }
            body  { font-family: 'DejaVu Sans', sans-serif; font-size: 10px; color: #222; }
            h1    { font-size: 15px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 4px; }
            p     { margin: 3px 0; }
            .meta { font-size: 9px; color: #555; margin-bottom: 12px; }
            .ep   { border: 1px solid #ddd; padding: 8px 10px; margin-bottom: 8px; page-break-inside: avoid; }
            .head { margin-bottom: 4px; }
            .method { display: inline; padding: 2px 7px; font-size: 8px; font-weight: bold; color: white; border-radius: 3px; }
            .path { font-size: 10px; font-weight: bold; margin-left: 6px; }
            .sum  { font-weight: bold; font-size: 10px; margin: 3px 0 2px; }
            .desc { font-size: 9px; color: #444; margin-bottom: 3px; }
            .auth { font-size: 8px; color: #888; margin: 2px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 8.5px; }
            th    { background: #f5f5f5; padding: 3px 6px; border: 1px solid #ddd; text-align: left; }
            td    { padding: 3px 6px; border: 1px solid #ddd; }
            code  { font-family: monospace; }
          </style>
        </head>
        <body>
          <h1>CAS &amp; Simulations API — Dokumentácia</h1>
          <p class="meta">Version: 1.0.0 &nbsp;|&nbsp; {$authHeader}</p>
          {$rows}
        </body>
        </html>
        HTML;
    }
}
