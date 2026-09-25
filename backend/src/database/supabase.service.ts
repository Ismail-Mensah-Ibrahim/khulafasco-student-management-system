import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private adminClient: SupabaseClient;
  private anonClient: SupabaseClient;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const url = this.configService.get<string>("supabase.url");
    const serviceRoleKey = this.configService.get<string>("supabase.serviceRoleKey");
    const anonKey = this.configService.get<string>("supabase.anonKey");

    if (!url || !serviceRoleKey) {
      this.logger.warn(
        "Supabase credentials incomplete. Admin features will be restricted."
      );
    }

    this.adminClient = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.anonClient = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.logger.log("Supabase clients initialized successfully.");
  }

  /**
   * Authoritative Admin Client with service_role key
   */
  getAdminClient(): SupabaseClient {
    return this.adminClient;
  }

  /**
   * Anon Client with public key
   */
  getAnonClient(): SupabaseClient {
    return this.anonClient;
  }

  /**
   * Scoped client with authenticated user's JWT for RLS evaluation
   */
  getClientForUser(token: string): SupabaseClient {
    const url = this.configService.get<string>("supabase.url");
    const anonKey = this.configService.get<string>("supabase.anonKey");

    return createClient(url, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
  }
}
