// ============================================================
// Core type definitions for the AI App Generator runtime
// ============================================================

export interface AppConfig {
  appName: string;
  appId?: string;
  description?: string;
  theme?: ThemeConfig;
  auth?: AuthConfig;
  models: ModelConfig[];
  pages: PageConfig[];
  notifications?: NotificationConfig[];
  localization?: LocalizationConfig;
}

export interface ThemeConfig {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  darkMode?: boolean;
  fontFamily?: string;
  borderRadius?: string;
}

export interface AuthConfig {
  enabled: boolean;
  methods?: ('email' | 'google' | 'github')[];
  userModel?: string;
  sessionDuration?: number; // minutes
  customFields?: FieldConfig[];
  ui?: {
    loginTitle?: string;
    signupTitle?: string;
    logo?: string;
  };
}

export interface ModelConfig {
  name: string;
  tableName?: string;
  fields: FieldConfig[];
  timestamps?: boolean;
  softDelete?: boolean;
  userScoped?: boolean; // restrict data to logged-in user
  relations?: RelationConfig[];
}

export interface FieldConfig {
  name: string;
  type: FieldType;
  label?: string;
  required?: boolean;
  unique?: boolean;
  defaultValue?: unknown;
  validation?: ValidationRule[];
  options?: string[]; // for select/enum
  placeholder?: string;
  hidden?: boolean;
  searchable?: boolean;
  sortable?: boolean;
}

export type FieldType =
  | 'string'
  | 'text'
  | 'number'
  | 'integer'
  | 'float'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'email'
  | 'url'
  | 'phone'
  | 'password'
  | 'select'
  | 'multiselect'
  | 'file'
  | 'image'
  | 'json'
  | 'uuid'
  | 'color'
  | 'rating'
  | 'currency';

export interface ValidationRule {
  type: 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'email' | 'url' | 'required' | 'custom';
  value?: unknown;
  message?: string;
}

export interface RelationConfig {
  type: 'hasMany' | 'belongsTo' | 'hasOne' | 'manyToMany';
  model: string;
  foreignKey?: string;
  through?: string; // for manyToMany
}

export interface PageConfig {
  path: string;
  title: string;
  icon?: string;
  layout?: 'default' | 'dashboard' | 'fullwidth' | 'sidebar';
  requiresAuth?: boolean;
  components: ComponentConfig[];
}

export interface ComponentConfig {
  type: ComponentType;
  id?: string;
  model?: string;
  props?: Record<string, unknown>;
  children?: ComponentConfig[];
  // Table-specific
  columns?: ColumnConfig[];
  actions?: ActionConfig[];
  // Form-specific
  fields?: string[]; // field names from model, or all if empty
  onSubmit?: string; // 'create' | 'update'
  successMessage?: string;
  // Dashboard-specific
  widgets?: WidgetConfig[];
  // Conditional rendering
  showIf?: { field: string; value: unknown };
}

export type ComponentType =
  | 'table'
  | 'form'
  | 'detail'
  | 'dashboard'
  | 'list'
  | 'card'
  | 'chart'
  | 'stats'
  | 'calendar'
  | 'kanban'
  | 'text'
  | 'heading'
  | 'image'
  | 'button'
  | 'tabs'
  | 'modal'
  | 'csv-import'
  | 'notification-inbox'
  | 'custom';

export interface ColumnConfig {
  field: string;
  header?: string;
  width?: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: 'text' | 'badge' | 'avatar' | 'date' | 'currency' | 'boolean' | 'link' | 'progress';
}

export interface ActionConfig {
  label: string;
  action: 'edit' | 'delete' | 'view' | 'custom';
  icon?: string;
  confirm?: boolean;
  confirmMessage?: string;
  endpoint?: string;
  method?: string;
}

export interface WidgetConfig {
  type: 'stat' | 'chart' | 'list' | 'table' | 'progress' | 'recent';
  title: string;
  model?: string;
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max';
  field?: string;
  filter?: Record<string, unknown>;
  chartType?: 'bar' | 'line' | 'pie' | 'donut' | 'area';
  span?: number; // grid columns span
  color?: string;
  icon?: string;
}

export interface NotificationConfig {
  event: string; // e.g. 'task.create', 'order.update'
  model: string;
  action: 'create' | 'update' | 'delete';
  title: string;
  message: string; // can use {{field}} placeholders
  email?: boolean;
  emailTemplate?: string;
}

export interface LocalizationConfig {
  defaultLocale: string;
  locales: string[];
  translations?: Record<string, Record<string, string>>;
}

// Runtime types
export interface RuntimeApp {
  id: string;
  config: AppConfig;
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface Notification {
  id: string;
  appId: string;
  userId?: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}
