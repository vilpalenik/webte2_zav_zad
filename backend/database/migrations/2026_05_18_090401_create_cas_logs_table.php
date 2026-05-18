<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cas_logs', function (Blueprint $table) {
            $table->id();
            $table->string('session_id'); // Na identifikáciu relácie používateľa
            $table->text('command');      // Odoslaný príkaz do CAS
            $table->text('output')->nullable(); // Odpoveď z CAS (alebo text chyby)
            $table->boolean('is_success'); // Info o korektnosti (true = OK, false = chyba)
            $table->timestamps();         // Automaticky vytvorí created_at (dátum a čas) a updated_at
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cas_logs');
    }
};
