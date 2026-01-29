/**
 * Mech Storage API Client
 * Uses mech-storage PostgreSQL tables API for data persistence
 */

const MECH_STORAGE_URL = process.env.MECH_STORAGE_URL || 'https://storage.mechdna.net';
const MECH_APP_ID = process.env.MECH_APP_ID;
const MECH_API_KEY = process.env.MECH_API_KEY;

if (!MECH_APP_ID || !MECH_API_KEY) {
  throw new Error('Missing MECH_APP_ID or MECH_API_KEY environment variables');
}

const baseUrl = `${MECH_STORAGE_URL}/api/apps/${MECH_APP_ID}`;

const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': MECH_API_KEY,
};

interface Column {
  name: string;
  type: string;
  primaryKey?: boolean;
  nullable?: boolean;
  unique?: boolean;
  defaultValue?: string;
}

interface QueryOptions {
  where?: Record<string, any>;
  orderBy?: string;
  orderDir?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  const json = await res.json();

  if (!res.ok) {
    const errorMsg = json.error?.message || json.message || `HTTP ${res.status}`;
    throw new Error(`Mech Storage Error: ${errorMsg}`);
  }

  return json;
}

export const mechStorage = {
  /**
   * Provision the database (call once on startup)
   */
  async provision(): Promise<void> {
    const provisionUrl = `${baseUrl}/provision`;
    const res = await fetch(provisionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ environment: 'prod' }),
    });
    const json = await res.json();
    if (!res.ok && json.error?.code !== 'DATABASE_ALREADY_EXISTS') {
      console.warn('Provision response:', json);
    }
  },

  /**
   * Create a table if it doesn't exist
   * Uses POST /api/apps/{appId}/postgresql/tables/{tableName}/schema
   */
  async createTable(tableName: string, columns: Column[], indexes?: { name: string; columns: string[]; unique?: boolean }[]): Promise<void> {
    try {
      await request(`/postgresql/tables/${tableName}/schema`, {
        method: 'POST',
        body: JSON.stringify({
          columns,
          indexes,
        }),
      });
    } catch (err: any) {
      // Ignore "table already exists" errors
      if (!err.message?.includes('already exists')) {
        throw err;
      }
    }
  },

  /**
   * Insert a single record
   * Uses POST /api/apps/{appId}/postgresql/tables/{tableName}
   */
  async insert<T extends Record<string, any>>(tableName: string, record: T): Promise<T> {
    const result = await request<{ success: boolean; records: T[] }>(`/postgresql/tables/${tableName}`, {
      method: 'POST',
      body: JSON.stringify([record]),
    });
    return result.records[0];
  },

  /**
   * Insert multiple records
   */
  async insertMany<T extends Record<string, any>>(tableName: string, records: T[]): Promise<T[]> {
    if (records.length === 0) return [];
    const result = await request<{ success: boolean; records: T[] }>(`/postgresql/tables/${tableName}`, {
      method: 'POST',
      body: JSON.stringify(records),
    });
    return result.records;
  },

  /**
   * Query records from a table
   * Uses GET /api/apps/{appId}/postgresql/tables/{tableName}
   */
  async query<T>(tableName: string, options: QueryOptions = {}): Promise<T[]> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', String(options.limit));
    if (options.offset) params.set('offset', String(options.offset));
    if (options.orderBy) params.set('orderBy', options.orderBy);
    if (options.orderDir) params.set('orderDir', options.orderDir);

    // Add where conditions as query params
    if (options.where) {
      for (const [key, value] of Object.entries(options.where)) {
        params.set(key, String(value));
      }
    }

    const queryString = params.toString();
    const path = `/postgresql/tables/${tableName}${queryString ? `?${queryString}` : ''}`;

    try {
      const result = await request<{ success: boolean; records: T[] }>(path);
      return result.records || [];
    } catch (err: any) {
      // Return empty array if table doesn't exist
      if (err.message?.includes('not found') || err.message?.includes('does not exist')) {
        return [];
      }
      throw err;
    }
  },

  /**
   * Get a single record by ID
   * Uses GET /api/apps/{appId}/postgresql/tables/{tableName}/{recordId}
   * Note: Only works for tables with 'id' as primary key column
   */
  async getById<T>(tableName: string, id: string): Promise<T | null> {
    try {
      const result = await request<{ success: boolean; record: T }>(`/postgresql/tables/${tableName}/${encodeURIComponent(id)}`);
      return result.record;
    } catch {
      return null;
    }
  },

  /**
   * Get a single record by a specific column value
   * Uses query API for tables with non-id primary keys
   */
  async getByColumn<T>(tableName: string, column: string, value: string): Promise<T | null> {
    try {
      const results = await this.query<T>(tableName, {
        where: { [column]: value },
        limit: 1,
      });
      return results[0] || null;
    } catch {
      return null;
    }
  },

  /**
   * Update a record
   * Uses PUT /api/apps/{appId}/postgresql/tables/{tableName}/{recordId}
   */
  async update<T extends Record<string, any>>(tableName: string, id: string, updates: Partial<T>): Promise<T> {
    const result = await request<{ success: boolean; record: T }>(`/postgresql/tables/${tableName}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return result.record;
  },

  /**
   * Delete a record
   * Uses DELETE /api/apps/{appId}/postgresql/tables/{tableName}/{recordId}
   */
  async delete(tableName: string, id: string): Promise<void> {
    await request(`/postgresql/tables/${tableName}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  /**
   * Execute a custom SQL query (read-only)
   * Uses POST /api/apps/{appId}/postgresql/query
   */
  async rawQuery<T>(sql: string, params: any[] = []): Promise<T[]> {
    const result = await request<{ success: boolean; data: { rows: T[] } }>(`/postgresql/query`, {
      method: 'POST',
      body: JSON.stringify({ query: sql, params }),
    });
    return result.data.rows;
  },
};
