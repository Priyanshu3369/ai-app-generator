import { ModelConfig, FieldConfig, FieldType } from '../types';
import { query } from './pool';

const typeMapping: Record<FieldType, string> = {
  string: 'TEXT', text: 'TEXT', number: 'NUMERIC', integer: 'INTEGER',
  float: 'DOUBLE PRECISION', boolean: 'BOOLEAN', date: 'DATE',
  datetime: 'TIMESTAMPTZ', email: 'TEXT', url: 'TEXT', phone: 'TEXT',
  password: 'TEXT', select: 'TEXT', multiselect: 'TEXT[]',
  file: 'TEXT', image: 'TEXT', json: 'JSONB', uuid: 'TEXT',
  color: 'TEXT', rating: 'INTEGER', currency: 'NUMERIC(12,2)',
};

function fieldToDDL(field: FieldConfig): string {
  const pgType = typeMapping[field.type] || 'TEXT';
  const parts = [`"${field.name}" ${pgType}`];
  if (field.name === 'id') parts.push('PRIMARY KEY');
  if (field.required && field.name !== 'id') parts.push('NOT NULL');
  if (field.unique && field.name !== 'id') parts.push('UNIQUE');
  if (field.defaultValue !== undefined && field.defaultValue !== null) {
    if (typeof field.defaultValue === 'string') {
      parts.push(`DEFAULT '${field.defaultValue.replace(/'/g, "''")}'`);
    } else if (typeof field.defaultValue === 'boolean') {
      parts.push(`DEFAULT ${field.defaultValue}`);
    } else if (typeof field.defaultValue === 'number') {
      parts.push(`DEFAULT ${field.defaultValue}`);
    }
  }
  return parts.join(' ');
}

export async function createTableForModel(appId: string, model: ModelConfig) {
  const tableName = `app_${appId.replace(/-/g, '_')}_${model.tableName || model.name}`;
  const columns: string[] = model.fields.map(f => fieldToDDL(f));

  if (model.userScoped) {
    if (!model.fields.find(f => f.name === 'user_id')) {
      columns.push('"user_id" TEXT');
    }
  }
  if (model.timestamps) {
    columns.push('"created_at" TIMESTAMPTZ DEFAULT NOW()');
    columns.push('"updated_at" TIMESTAMPTZ DEFAULT NOW()');
  }
  if (model.softDelete) {
    columns.push('"deleted_at" TIMESTAMPTZ');
  }

  const sql = `CREATE TABLE IF NOT EXISTS "${tableName}" (${columns.join(', ')})`;
  await query(sql);

  // Try to add any missing columns (for schema evolution)
  try {
    const existingCols = await query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
      [tableName]
    );
    const existingNames = new Set(existingCols.rows.map((r: { column_name: string }) => r.column_name));
    for (const field of model.fields) {
      if (!existingNames.has(field.name)) {
        const pgType = typeMapping[field.type] || 'TEXT';
        await query(`ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${field.name}" ${pgType}`);
      }
    }
  } catch {
    // Non-critical: if ALTER fails, continue
  }

  return tableName;
}

export async function createTablesForApp(appId: string, models: ModelConfig[]) {
  const tableMap: Record<string, string> = {};
  for (const model of models) {
    const tableName = await createTableForModel(appId, model);
    tableMap[model.name] = tableName;
  }
  return tableMap;
}

export function getTableName(appId: string, modelName: string): string {
  return `app_${appId.replace(/-/g, '_')}_${modelName.toLowerCase()}`;
}
