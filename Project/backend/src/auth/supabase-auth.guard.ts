import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
  } from '@nestjs/common';
  import { Request } from 'express';
  import { createClient } from '@supabase/supabase-js';
  
  @Injectable()
  export class SupabaseAuthGuard implements CanActivate {
    private supabase;
  
    constructor() {
      const supabaseUrl = process.env.SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
      if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Supabase env variables are missing');
      }
  
      this.supabase = createClient(supabaseUrl, serviceRoleKey);
    }
  
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const { data, error } = await this.supabase.auth.getUser(token);

        console.log('SUPABASE ERROR:', error);
         console.log('SUPABASE USER:', data?.user);
         
      const req = context.switchToHttp().getRequest<Request>();
  
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new UnauthorizedException('Missing Authorization header');
      }
  
      const [type, token] = authHeader.split(' ');
      if (type !== 'Bearer' || !token) {
        throw new UnauthorizedException('Invalid Authorization format');
      }
  
      const { data, error } = await this.supabase.auth.getUser(token);
  
      if (error || !data?.user) {
        throw new UnauthorizedException('Invalid or expired token');
      }
  
      // ✅ 挂载 Supabase user
      (req as any).user = data.user;
  
      return true;
    }
  }
  