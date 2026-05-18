<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('animation_logs', function (Blueprint $table) {
            $table->id();
            $table->string('animation_type'); // Názov animácie: 'inverted_pendulum' alebo 'ball_beam'
            $table->string('user_token');     // Unikátny anonymný token uložený v cookies používateľa
            $table->string('city')->nullable();    // Mesto zistené z IP adresy
            $table->string('country')->nullable(); // Štát zistený z IP adresy
            $table->timestamps();             // created_at nám povie presný čas použitia
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('animation_logs');
    }
};
