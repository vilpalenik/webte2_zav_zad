<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AnimationLog extends Model
{
    protected $fillable = ['animation_type', 'user_token', 'city', 'country'];
}
