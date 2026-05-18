<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use App\Models\AnimationLog;

class AnimationController extends Controller
{
    private function cooldownMinutes(): int
    {
        return max(1, (int) env('ANIMATION_COOLDOWN_MINUTES', 10));
    }

    public function log(Request $request)
    {
        $request->validate([
            'type'  => 'required|in:ball-beam,pendulum',
            'token' => 'required|string|max:64',
        ]);

        $type  = $request->input('type');
        $token = $request->input('token');
        $cacheKey = "anim_cooldown_{$token}_{$type}";

        if (Cache::has($cacheKey)) {
            return response()->json(['status' => 'ok', 'logged' => false]);
        }

        $ip   = $request->ip();
        $city = null;
        $country = null;

        if ($ip && !in_array($ip, ['127.0.0.1', '::1'])) {
            try {
                $ctx = stream_context_create(['http' => ['timeout' => 3]]);
                $geo = json_decode(file_get_contents("http://ip-api.com/json/{$ip}?fields=city,country", false, $ctx), true);
                $city    = $geo['city']    ?? null;
                $country = $geo['country'] ?? null;
            } catch (\Throwable $e) {}
        }

        AnimationLog::create([
            'animation_type' => $type,
            'user_token'     => $token,
            'city'           => $city,
            'country'        => $country,
        ]);

        Cache::put($cacheKey, true, now()->addMinutes($this->cooldownMinutes()));

        return response()->json(['status' => 'ok', 'logged' => true]);
    }

    public function stats()
    {
        $types = ['pendulum', 'ball-beam'];
        $data  = [];

        foreach ($types as $type) {
            $count = AnimationLog::where('animation_type', $type)->count();
            $last  = AnimationLog::where('animation_type', $type)->latest()->first();
            $data[] = [
                'type'         => $type,
                'count'        => $count,
                'last_city'    => $last?->city,
                'last_country' => $last?->country,
            ];
        }

        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function detail(string $type)
    {
        if (!in_array($type, ['pendulum', 'ball-beam'])) {
            return response()->json(['status' => 'error', 'message' => 'Unknown type'], 404);
        }

        $logs = AnimationLog::where('animation_type', $type)
            ->latest()
            ->get(['id', 'user_token', 'city', 'country', 'created_at']);

        return response()->json(['status' => 'success', 'data' => $logs]);
    }
}
