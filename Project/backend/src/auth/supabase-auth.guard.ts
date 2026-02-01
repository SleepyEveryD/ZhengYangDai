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
      // 1. req 
      const req = context.switchToHttp().getRequest<Request>();
  
      //  header
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new UnauthorizedException('Missing Authorization header');
      }
  
      //  token
      const [type, token] = authHeader.split(' ');
      if (type !== 'Bearer' || !token) {
        throw new UnauthorizedException('Invalid Authorization format');
      }
  
      //  token
      const result = await this.supabase.auth.getUser(token);
  
      const user = result.data?.user;
      const supabaseError = result.error;
  
      //console.log('SUPABASE ERROR:', supabaseError);
      //console.log('SUPABASE USER:', user);
  
      if (supabaseError || !user) {
        throw new UnauthorizedException('Invalid or expired token');
      }
  
    
      (req as any).user = user;
  
      return true;
    }
  }
  