// ============================================================
// Config Parser: validates, normalizes, and fills defaults
// for potentially incomplete/inconsistent JSON configurations
// ============================================================

import { AppConfig, ModelConfig, FieldConfig, PageConfig, ComponentConfig, FieldType } from './types';

const VALID_FIELD_TYPES: FieldType[] = [
  'string', 'text', 'number', 'integer', 'float', 'boolean',
  'date', 'datetime', 'email', 'url', 'phone', 'password',
  'select', 'multiselect', 'file', 'image', 'json', 'uuid',
  'color', 'rating', 'currency'
];

const DEFAULT_THEME = {
  primaryColor: '#6366f1',
  secondaryColor: '#8b5cf6',
  accentColor: '#f59e0b',
  darkMode: true,
  fontFamily: 'Inter, sans-serif',
  borderRadius: '8px',
};

/**
 * Parse and normalize an app configuration.
 * Handles missing fields, unknown types, and inconsistencies.
 */
export function parseConfig(raw: unknown): { config: AppConfig; warnings: string[] } {
  const warnings: string[] = [];

  if (!raw || typeof raw !== 'object') {
    throw new Error('Configuration must be a valid JSON object');
  }

  const input = raw as Record<string, unknown>;

  // App name
  const appName = typeof input.appName === 'string' && input.appName.trim()
    ? input.appName.trim()
    : 'Untitled App';
  if (!input.appName) warnings.push('Missing appName, defaulting to "Untitled App"');

  // Description
  const description = typeof input.description === 'string' ? input.description : '';

  // Theme
  const theme = { ...DEFAULT_THEME, ...(typeof input.theme === 'object' && input.theme ? input.theme as object : {}) };

  // Models
  let models: ModelConfig[] = [];
  if (Array.isArray(input.models)) {
    models = input.models.map((m, i) => normalizeModel(m, i, warnings));
  } else if (input.models && typeof input.models === 'object') {
    // Support object format { modelName: { fields: [...] } }
    models = Object.entries(input.models as Record<string, unknown>).map(([name, def], i) => {
      if (typeof def === 'object' && def !== null) {
        return normalizeModel({ name, ...(def as object) }, i, warnings);
      }
      warnings.push(`Model "${name}" has invalid definition, skipping`);
      return null;
    }).filter(Boolean) as ModelConfig[];
  } else {
    warnings.push('No models defined, creating empty model list');
  }

  // Pages
  let pages: PageConfig[] = [];
  if (Array.isArray(input.pages)) {
    pages = input.pages.map((p, i) => normalizePage(p, i, models, warnings));
  } else {
    // Auto-generate pages from models
    warnings.push('No pages defined, auto-generating from models');
    pages = models.map(m => generateDefaultPage(m));
  }

  // Auth
  const auth = normalizeAuth(input.auth, warnings);

  // Notifications
  const notifications = Array.isArray(input.notifications)
    ? input.notifications.filter(n => n && typeof n === 'object')
    : [];

  // Localization
  const localization = input.localization && typeof input.localization === 'object'
    ? input.localization as AppConfig['localization']
    : undefined;

  const config: AppConfig = {
    appName,
    description,
    theme,
    auth,
    models,
    pages,
    notifications,
    localization,
  };

  return { config, warnings };
}

function normalizeModel(raw: unknown, index: number, warnings: string[]): ModelConfig {
  if (!raw || typeof raw !== 'object') {
    warnings.push(`Model at index ${index} is invalid, creating placeholder`);
    return {
      name: `model_${index}`,
      fields: [{ name: 'id', type: 'uuid', required: true }],
      timestamps: true,
    };
  }

  const input = raw as Record<string, unknown>;
  const name = typeof input.name === 'string' && input.name.trim()
    ? sanitizeName(input.name.trim())
    : `model_${index}`;

  if (!input.name) warnings.push(`Model at index ${index} missing name, using "${name}"`);

  // Normalize fields
  let fields: FieldConfig[] = [];
  if (Array.isArray(input.fields)) {
    fields = input.fields.map((f, fi) => normalizeField(f, fi, name, warnings));
  } else if (input.fields && typeof input.fields === 'object') {
    // Support { fieldName: 'type' } or { fieldName: { type, required, ... } }
    fields = Object.entries(input.fields as Record<string, unknown>).map(([fname, fdef], fi) => {
      if (typeof fdef === 'string') {
        return normalizeField({ name: fname, type: fdef }, fi, name, warnings);
      } else if (typeof fdef === 'object' && fdef !== null) {
        return normalizeField({ name: fname, ...(fdef as object) }, fi, name, warnings);
      }
      warnings.push(`Field "${fname}" in model "${name}" has invalid definition`);
      return normalizeField({ name: fname, type: 'string' }, fi, name, warnings);
    });
  }

  // Ensure there's always an id field
  if (!fields.find(f => f.name === 'id')) {
    fields.unshift({ name: 'id', type: 'uuid', required: true, hidden: true });
  }

  const tableName = typeof input.tableName === 'string'
    ? sanitizeName(input.tableName)
    : sanitizeName(name);

  return {
    name,
    tableName,
    fields,
    timestamps: input.timestamps !== false,
    softDelete: input.softDelete === true,
    userScoped: input.userScoped === true,
    relations: Array.isArray(input.relations) ? input.relations : [],
  };
}

function normalizeField(raw: unknown, index: number, modelName: string, warnings: string[]): FieldConfig {
  if (!raw || typeof raw !== 'object') {
    warnings.push(`Field at index ${index} in "${modelName}" is invalid`);
    return { name: `field_${index}`, type: 'string' };
  }

  const input = raw as Record<string, unknown>;
  const name = typeof input.name === 'string' && input.name.trim()
    ? sanitizeName(input.name.trim())
    : `field_${index}`;

  let type: FieldType = 'string';
  if (typeof input.type === 'string') {
    const rawType = input.type.toLowerCase().trim();
    if (VALID_FIELD_TYPES.includes(rawType as FieldType)) {
      type = rawType as FieldType;
    } else {
      // Try to map common aliases
      const typeMap: Record<string, FieldType> = {
        'str': 'string', 'varchar': 'string', 'char': 'string',
        'int': 'integer', 'bigint': 'integer', 'smallint': 'integer',
        'decimal': 'float', 'double': 'float', 'real': 'float', 'numeric': 'float',
        'bool': 'boolean', 'bit': 'boolean',
        'timestamp': 'datetime', 'timestamptz': 'datetime',
        'enum': 'select', 'dropdown': 'select',
        'textarea': 'text', 'longtext': 'text', 'richtext': 'text',
        'money': 'currency', 'price': 'currency',
        'link': 'url', 'href': 'url',
        'mail': 'email',
        'tel': 'phone', 'telephone': 'phone',
        'img': 'image', 'photo': 'image', 'avatar': 'image',
        'attachment': 'file', 'document': 'file',
        'object': 'json', 'jsonb': 'json', 'map': 'json',
        'stars': 'rating', 'score': 'rating',
      };
      type = typeMap[rawType] || 'string';
      if (!typeMap[rawType]) {
        warnings.push(`Unknown field type "${input.type}" for "${name}" in "${modelName}", defaulting to "string"`);
      }
    }
  }

  return {
    name,
    type,
    label: typeof input.label === 'string' ? input.label : formatLabel(name),
    required: input.required === true,
    unique: input.unique === true,
    defaultValue: input.defaultValue ?? input.default ?? undefined,
    validation: Array.isArray(input.validation) ? input.validation : [],
    options: Array.isArray(input.options) ? input.options.map(String) : undefined,
    placeholder: typeof input.placeholder === 'string' ? input.placeholder : undefined,
    hidden: input.hidden === true,
    searchable: input.searchable !== false,
    sortable: input.sortable !== false,
  };
}

function normalizePage(raw: unknown, index: number, models: ModelConfig[], warnings: string[]): PageConfig {
  if (!raw || typeof raw !== 'object') {
    warnings.push(`Page at index ${index} is invalid, skipping`);
    return {
      path: `/page-${index}`,
      title: `Page ${index}`,
      components: [],
    };
  }

  const input = raw as Record<string, unknown>;
  const path = typeof input.path === 'string' ? input.path : `/page-${index}`;
  const title = typeof input.title === 'string' ? input.title : `Page ${index}`;

  let components: ComponentConfig[] = [];
  if (Array.isArray(input.components)) {
    components = input.components.map((c, ci) => normalizeComponent(c, ci, models, warnings));
  } else if (input.component && typeof input.component === 'object') {
    // Single component shorthand
    components = [normalizeComponent(input.component, 0, models, warnings)];
  } else if (typeof input.model === 'string') {
    // Auto-generate table + form for the model
    const model = models.find(m => m.name === input.model);
    if (model) {
      components = [
        { type: 'table', model: model.name, columns: model.fields.filter(f => !f.hidden).map(f => ({ field: f.name, header: f.label })) },
      ];
    }
  }

  return {
    path,
    title,
    icon: typeof input.icon === 'string' ? input.icon : undefined,
    layout: normalizeLayout(input.layout),
    requiresAuth: input.requiresAuth === true,
    components,
  };
}

function normalizeComponent(raw: unknown, index: number, models: ModelConfig[], warnings: string[]): ComponentConfig {
  if (!raw || typeof raw !== 'object') {
    return { type: 'text', props: { content: 'Invalid component configuration' } };
  }

  const input = raw as Record<string, unknown>;
  let type = typeof input.type === 'string' ? input.type.toLowerCase() : 'text';

  // Map common component type aliases
  const typeMap: Record<string, string> = {
    'grid': 'table', 'datagrid': 'table', 'datatable': 'table',
    'input': 'form', 'create': 'form', 'edit': 'form',
    'view': 'detail', 'show': 'detail', 'display': 'detail',
    'overview': 'dashboard', 'summary': 'dashboard',
    'cards': 'list', 'gallery': 'list',
    'graph': 'chart', 'visualization': 'chart',
    'metrics': 'stats', 'kpi': 'stats',
    'upload': 'csv-import', 'import': 'csv-import',
    'notifications': 'notification-inbox', 'alerts': 'notification-inbox',
    'header': 'heading', 'title': 'heading',
    'paragraph': 'text', 'content': 'text',
    'btn': 'button', 'action': 'button',
  };

  if (typeMap[type]) {
    type = typeMap[type];
  }

  const validTypes = [
    'table', 'form', 'detail', 'dashboard', 'list', 'card', 'chart',
    'stats', 'calendar', 'kanban', 'text', 'heading', 'image', 'button',
    'tabs', 'modal', 'csv-import', 'notification-inbox', 'custom'
  ];

  if (!validTypes.includes(type)) {
    warnings.push(`Unknown component type "${type}" at index ${index}, rendering as text`);
    type = 'text';
  }

  // If model is specified, verify it exists
  const modelName = typeof input.model === 'string' ? input.model : undefined;
  if (modelName && !models.find(m => m.name === modelName)) {
    warnings.push(`Component references unknown model "${modelName}"`);
  }

  return {
    type: type as ComponentConfig['type'],
    id: typeof input.id === 'string' ? input.id : `component_${index}`,
    model: modelName,
    props: typeof input.props === 'object' && input.props ? input.props as Record<string, unknown> : {},
    columns: Array.isArray(input.columns) ? input.columns : undefined,
    actions: Array.isArray(input.actions) ? input.actions : undefined,
    fields: Array.isArray(input.fields) ? input.fields.map(String) : undefined,
    onSubmit: typeof input.onSubmit === 'string' ? input.onSubmit : undefined,
    successMessage: typeof input.successMessage === 'string' ? input.successMessage : undefined,
    widgets: Array.isArray(input.widgets) ? input.widgets : undefined,
    children: Array.isArray(input.children)
      ? input.children.map((c, ci) => normalizeComponent(c, ci, models, warnings))
      : undefined,
  };
}

function normalizeAuth(raw: unknown, warnings: string[]): AppConfig['auth'] {
  if (!raw || typeof raw !== 'object') {
    return { enabled: false };
  }
  const input = raw as Record<string, unknown>;
  return {
    enabled: input.enabled !== false,
    methods: Array.isArray(input.methods) ? input.methods : ['email'],
    userModel: typeof input.userModel === 'string' ? input.userModel : undefined,
    sessionDuration: typeof input.sessionDuration === 'number' ? input.sessionDuration : 1440,
    ui: typeof input.ui === 'object' && input.ui ? input.ui as AuthUIConfig : undefined,
  };
}

type AuthUIConfig = NonNullable<NonNullable<AppConfig['auth']>['ui']>;

function normalizeLayout(raw: unknown): PageConfig['layout'] {
  const valid = ['default', 'dashboard', 'fullwidth', 'sidebar'];
  if (typeof raw === 'string' && valid.includes(raw)) {
    return raw as PageConfig['layout'];
  }
  return 'default';
}

function generateDefaultPage(model: ModelConfig): PageConfig {
  const visibleFields = model.fields.filter(f => !f.hidden);
  return {
    path: `/${model.name}`,
    title: formatLabel(model.name),
    layout: 'default',
    components: [
      {
        type: 'table',
        model: model.name,
        columns: visibleFields.slice(0, 8).map(f => ({
          field: f.name,
          header: f.label || formatLabel(f.name),
          sortable: f.sortable,
        })),
        actions: [
          { label: 'Edit', action: 'edit' as const, icon: 'pencil' },
          { label: 'Delete', action: 'delete' as const, icon: 'trash', confirm: true },
        ],
      },
    ],
  };
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
}

function formatLabel(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

export { sanitizeName, formatLabel };
