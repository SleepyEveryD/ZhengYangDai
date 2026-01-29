import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
  } from '@nestjs/common';
  import { Request } from 'express';
  import { createClient, SupabaseClient } from '@supabase/supabase-js';
  
  @Injectable()
  export class SupabaseAuthGuard implements CanActivate {
    private supabase: SupabaseClient;
  
    constructor() {
      const supabaseUrl = process.env.SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
      if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Supabase env variables are missing');
      }
  
      this.supabase = createClient(supabaseUrl, serviceRoleKey);
    }
  
    async canActivate(context: ExecutionContext): Promise<boolean> {
      // ✅ 1. req 在这里
      const req = context.switchToHttp().getRequest<Request>();
  
      // ✅ 2. 先拿 header
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new UnauthorizedException('Missing Authorization header');
      }
  
      // ✅ 3. 再解析 token
      const [type, token] = authHeader.split(' ');
      if (type !== 'Bearer' || !token) {
        throw new UnauthorizedException('Invalid Authorization format');
      }
  
      // ✅ 4. 用 token
      const result = await this.supabase.auth.getUser(token);
  
      const user = result.data?.user;
      const supabaseError = result.error;
  
      console.log('SUPABASE ERROR:', supabaseError);
      console.log('SUPABASE USER:', user);
  
      if (supabaseError || !user) {
        throw new UnauthorizedException('Invalid or expired token');
      }
  
      // ✅ 5. req 还在作用域里
      (req as any).user = user;
  
      return true;
    }
  }
  