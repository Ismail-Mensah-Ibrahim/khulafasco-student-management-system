import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import { SupabaseService } from "./supabase.service";

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService
  ) {}

  async onModuleInit() {
    const dbUrl = this.configService.get<string>("database.url");

    if (dbUrl) {
      try {
        this.pool = new Pool({
          connectionString: dbUrl,
          ssl: {
            rejectUnauthorized: false,
          },
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        });

        // Test connection
        const client = await this.pool.connect();
        client.release();
        this.logger.log("Direct PostgreSQL connection pool initialized.");
      } catch (err: any) {
        this.logger.warn(
          `Failed to initialize direct PostgreSQL pool (${err.message}). Falling back to Supabase client.`
        );
        this.pool = null;
      }
    } else {
      this.logger.log(
        "DATABASE_URL not set; running database operations through Supabase service client."
      );
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
      this.logger.log("PostgreSQL connection pool closed.");
    }
  }

  /**
   * Health ping to check database connectivity
   */
  async ping(): Promise<boolean> {
    try {
      if (this.pool) {
        const res = await this.pool.query("SELECT 1 AS alive;");
        return res.rows[0]?.alive === 1;
      }
      // Fallback via Supabase
      const { data, error } = await this.supabaseService
        .getAdminClient()
        .from("school_settings")
        .select("id")
        .limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Execute parameterized query
   */
  async query<T extends QueryResultRow = any>(
    text: string,
    params: any[] = []
  ): Promise<QueryResult<T>> {
    if (this.pool) {
      return this.pool.query<T>(text, params);
    }
    throw new Error(
      "Direct SQL query requires DATABASE_URL connection pool. Use Supabase client or RPC for remote queries."
    );
  }

  /**
   * Execute atomic multi-statement transaction
   */
  async withTransaction<T>(
    fn: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    if (!this.pool) {
      throw new Error(
        "Database transactions require DATABASE_URL connection pool."
      );
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN;");
      const result = await fn(client);
      await client.query("COMMIT;");
      return result;
    } catch (err) {
      await client.query("ROLLBACK;");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Call a Postgres RPC function safely via Supabase client
   */
  async rpc<T = any>(
    functionName: string,
    params: Record<string, any> = {}
  ): Promise<{ data: T | null; error: any }> {
    return this.supabaseService
      .getAdminClient()
      .rpc(functionName, params) as any;
  }
}
