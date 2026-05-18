<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CasLog extends Model
{
    protected $fillable = ['session_id', 'command', 'output', 'is_success'];
}
