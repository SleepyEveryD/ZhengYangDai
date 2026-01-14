import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Controller('test')
export class TestController {
  @UseGuards(SupabaseAuthGuard)
  @Get('protected')
  getProtected(@Req() req) {
    return {
      message: 'You are authenticated',
      user: req.user,
    };
  }
}
