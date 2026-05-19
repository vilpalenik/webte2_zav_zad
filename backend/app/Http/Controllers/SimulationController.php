<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class SimulationController extends Controller
{
    private function checkAuth(Request $request): bool
    {
        $apiKey = $request->header('X-API-KEY');
        return $apiKey && $apiKey === env('CAS_API_KEY');
    }

    public function run(Request $request)
    {
        if (!$this->checkAuth($request)) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 401);
        }

        $request->validate([
            'type' => 'required|in:ball-beam,pendulum',
            'r1'   => 'required|numeric|between:-2,2',
            'r2'   => 'required|numeric|between:-2,2',
        ]);

        $type = $request->input('type');
        $r1   = (float) $request->input('r1');
        $r2   = (float) $request->input('r2');

        $script = $type === 'pendulum'
            ? $this->buildPendulumScript($r1, $r2)
            : $this->buildBallBeamScript($r1, $r2);

        ignore_user_abort(false); // let PHP detect client disconnect during exec
        $tmpBase = tempnam(sys_get_temp_dir(), 'oct_');
        $tmpFile = $tmpBase . '.m';
        file_put_contents($tmpFile, $script);

        exec('octave --no-gui --norc ' . escapeshellarg($tmpFile) . ' 2>/dev/null', $output, $returnCode);

        @unlink($tmpFile);
        @unlink($tmpBase);

        // client navigated away while Octave was running — stop silently
        if (connection_aborted()) {
            return response()->json(['status' => 'aborted'], 200);
        }

        if ($returnCode !== 0 || empty($output)) {
            return response()->json(['status' => 'error', 'message' => 'Simulation failed'], 500);
        }

        $data = json_decode(implode('', $output), true);

        if (!$data) {
            return response()->json(['status' => 'error', 'message' => 'Failed to parse simulation output'], 500);
        }

        $delayMs = (int) env('SIMULATION_DELAY_MS', 0);
        if ($delayMs > 0) {
            usleep($delayMs * 1000);
        }

        return response()->json(['status' => 'success', 'data' => $data]);
    }

    private function buildBallBeamScript(float $r1, float $r2): string
    {
        return <<<OCTAVE
        warning('off', 'all');
        pkg load control;
        m = 0.111; R = 0.015; g = -9.8; J = 9.99e-6;
        H = -m*g/(J/(R^2)+m);
        A = [0 1 0 0; 0 0 H 0; 0 0 0 1; 0 0 0 0];
        B = [0;0;0;1]; C = [1 0 0 0]; D = [0];
        K = place(A,B,[-2+2i,-2-2i,-20,-80]);
        N = -inv(C*inv(A-B*K)*B);
        sys = ss(A-B*K, B*N, C, D);
        t = (0:0.02:5)';
        [y1,t1,x1] = lsim(sys, {$r1}*ones(size(t)), t, [0;0;0;0]);
        [y2,t2,x2] = lsim(sys, {$r2}*ones(size(t)), t, x1(end,:)');
        result.t = t1';
        result.y1 = y1';
        result.beam1 = x1(:,3)';
        result.y2 = y2';
        result.beam2 = x2(:,3)';
        printf('%s', jsonencode(result));
        OCTAVE;
    }

    private function buildPendulumScript(float $r1, float $r2): string
    {
        return <<<OCTAVE
        warning('off', 'all');
        pkg load control;
        M=.5; m=0.2; b=0.1; I=0.006; g=9.8; l=0.3;
        p = I*(M+m)+M*m*l^2;
        A=[0 1 0 0; 0 -(I+m*l^2)*b/p (m^2*g*l^2)/p 0; 0 0 0 1; 0 -(m*l*b)/p m*g*l*(M+m)/p 0];
        B=[0; (I+m*l^2)/p; 0; m*l/p];
        C=[1 0 0 0; 0 0 1 0]; D=[0;0];
        K=lqr(A,B,C'*C,1); Ac=A-B*K;
        N=-inv(C(1,:)*inv(A-B*K)*B);
        sys=ss(Ac,B*N,C,D);
        t=(0:0.05:10)';
        [y1,t1,x1]=lsim(sys,{$r1}*ones(size(t)),t,[0;0;0;0]);
        [y2,t2,x2]=lsim(sys,{$r2}*ones(size(t)),t,x1(end,:)');
        result.t=t1';
        result.cart1=y1(:,1)';
        result.angle1=y1(:,2)';
        result.cart2=y2(:,1)';
        result.angle2=y2(:,2)';
        printf('%s', jsonencode(result));
        OCTAVE;
    }
}
