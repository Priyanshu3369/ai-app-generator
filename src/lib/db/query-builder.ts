import { query } from './pool';
import { getTableName } from './schema-builder';
import { v4 as uuidv4 } from 'uuid';

interface QueryOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, unknown>;
  search?: string;
  searchFields?: string[];
  userId?: string;
  userScoped?: boolean;
}

export async function findMany(appId: string, modelName: string, options: QueryOptions = {}, appName?: string) {
  const tableName = getTableName(appId, modelName, appName);
  const { page = 1, pageSize = 25, sortBy = 'created_at', sortOrder = 'desc', filters = {}, search, searchFields = [], userId, userScoped } = options;
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (userScoped && userId) {
    conditions.push(`"user_id" = $${paramIdx++}`);
    params.push(userId);
  }

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      conditions.push(`"${key.replace(/[^a-zA-Z0-9_]/g, '')}" = $${paramIdx++}`);
      params.push(value);
    }
  }

  if (search && searchFields.length > 0) {
    const searchConds = searchFields.map(f => `"${f.replace(/[^a-zA-Z0-9_]/g, '')}"::TEXT ILIKE $${paramIdx}`);
    conditions.push(`(${searchConds.join(' OR ')})`);
    params.push(`%${search}%`);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const safeSortBy = sortBy.replace(/[^a-zA-Z0-9_]/g, '');
  const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';
  const offset = (page - 1) * pageSize;

  const countResult = await query(`SELECT COUNT(*) as total FROM "${tableName}" ${whereClause}`, params);
  const total = parseInt(countResult.rows[0]?.total || '0');

  const dataResult = await query(
    `SELECT * FROM "${tableName}" ${whereClause} ORDER BY "${safeSortBy}" ${safeSortOrder} LIMIT ${pageSize} OFFSET ${offset}`,
    params
  );

  return {
    data: dataResult.rows,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

export async function findOne(appId: string, modelName: string, id: string, userId?: string, userScoped?: boolean, appName?: string) {
  const tableName = getTableName(appId, modelName, appName);
  let sql = `SELECT * FROM "${tableName}" WHERE "id" = $1`;
  const params: unknown[] = [id];
  if (userScoped && userId) {
    sql += ` AND "user_id" = $2`;
    params.push(userId);
  }
  const result = await query(sql, params);
  return result.rows[0] || null;
}

export async function create(appId: string, modelName: string, data: Record<string, unknown>, userId?: string, userScoped?: boolean, appName?: string) {
  const tableName = getTableName(appId, modelName, appName);
  const record: Record<string, unknown> = { ...data, id: data.id || uuidv4() };
  if (userScoped && userId) {
    record.user_id = userId;
  }
  const keys = Object.keys(record).filter(k => record[k] !== undefined);
  const values = keys.map(k => record[k]);
  const placeholders = keys.map((_, i) => `$${i + 1}`);
  const columns = keys.map(k => `"${k.replace(/[^a-zA-Z0-9_]/g, '')}"`);

  const result = await query(
    `INSERT INTO "${tableName}" (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    values
  );
  return result.rows[0];
}

export async function update(appId: string, modelName: string, id: string, data: Record<string, unknown>, userId?: string, userScoped?: boolean, appName?: string) {
  const tableName = getTableName(appId, modelName, appName);
  const keys = Object.keys(data).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at' && data[k] !== undefined);
  if (keys.length === 0) return findOne(appId, modelName, id, userId, userScoped, appName);

  const setClauses = keys.map((k, i) => `"${k.replace(/[^a-zA-Z0-9_]/g, '')}" = $${i + 1}`);
  const values: unknown[] = keys.map(k => data[k]);
  let paramIdx = keys.length + 1;

  let sql = `UPDATE "${tableName}" SET ${setClauses.join(', ')}, "updated_at" = NOW() WHERE "id" = $${paramIdx++}`;
  values.push(id);

  if (userScoped && userId) {
    sql += ` AND "user_id" = $${paramIdx++}`;
    values.push(userId);
  }

  sql += ' RETURNING *';
  const result = await query(sql, values);
  return result.rows[0] || null;
}

export async function remove(appId: string, modelName: string, id: string, userId?: string, userScoped?: boolean, softDelete?: boolean, appName?: string) {
  const tableName = getTableName(appId, modelName, appName);
  const params: unknown[] = [id];
  let sql: string;

  if (softDelete) {
    sql = `UPDATE "${tableName}" SET "deleted_at" = NOW() WHERE "id" = $1`;
  } else {
    sql = `DELETE FROM "${tableName}" WHERE "id" = $1`;
  }

  if (userScoped && userId) {
    sql += ` AND "user_id" = $2`;
    params.push(userId);
  }

  await query(sql, params);
  return { deleted: true };
}

export async function bulkCreate(appId: string, modelName: string, records: Record<string, unknown>[], userId?: string, userScoped?: boolean, appName?: string) {
  const results = [];
  for (const record of records) {
    try {
      const created = await create(appId, modelName, record, userId, userScoped, appName);
      results.push({ success: true, data: created });
    } catch (error) {
      results.push({ success: false, error: (error as Error).message });
    }
  }
  return results;
}

export async function aggregate(appId: string, modelName: string, aggType: string, field?: string, filters?: Record<string, unknown>, appName?: string) {
  const tableName = getTableName(appId, modelName, appName);
  const safeField = field ? `"${field.replace(/[^a-zA-Z0-9_]/g, '')}"` : '*';
  let aggFunc: string;
  switch (aggType) {
    case 'count': aggFunc = 'COUNT(*)'; break;
    case 'sum': aggFunc = `SUM(${safeField})`; break;
    case 'avg': aggFunc = `AVG(${safeField})`; break;
    case 'min': aggFunc = `MIN(${safeField})`; break;
    case 'max': aggFunc = `MAX(${safeField})`; break;
    default: aggFunc = 'COUNT(*)';
  }

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        conditions.push(`"${key.replace(/[^a-zA-Z0-9_]/g, '')}" = $${paramIdx++}`);
        params.push(value);
      }
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await query(`SELECT ${aggFunc} as value FROM "${tableName}" ${whereClause}`, params);
  return parseFloat(result.rows[0]?.value) || 0;
}
