"use client";

import { useState, useCallback, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { AdminButton } from "@/components/admin/shared/AdminButton";

// ==================== 类型定义 ====================

export type FieldType = 
  | "text" 
  | "number" 
  | "email" 
  | "password" 
  | "textarea"
  | "select" 
  | "multiselect"
  | "checkbox"
  | "switch"
  | "date"
  | "datetime"
  | "file"
  | "custom";

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: unknown) => string | undefined;
  };
  defaultValue?: unknown;
  helpText?: string;
  render?: (props: {
    value: unknown;
    onChange: (value: unknown) => void;
    onBlur: () => void;
    error?: string;
    disabled?: boolean;
  }) => ReactNode;
  colSpan?: 1 | 2 | 3;
}

export interface FormBuilderProps {
  fields: FormField[];
  initialData?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  submitText?: string;
  cancelText?: string;
  layout?: "grid" | "stack";
  columns?: 1 | 2 | 3;
}

// ==================== 验证函数 ====================

function validateField(
  field: FormField,
  value: unknown
): string | undefined {
  if (field.required && (value === undefined || value === null || value === "")) {
    return `${field.label}不能为空`;
  }

  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const { validation } = field;
  if (!validation) return undefined;

  if (field.type === "number" && typeof value === "number") {
    if (validation.min !== undefined && value < validation.min) {
      return `${field.label}不能小于 ${validation.min}`;
    }
    if (validation.max !== undefined && value > validation.max) {
      return `${field.label}不能大于 ${validation.max}`;
    }
  }

  if (typeof value === "string") {
    if (validation.minLength !== undefined && value.length < validation.minLength) {
      return `${field.label}至少需要 ${validation.minLength} 个字符`;
    }
    if (validation.maxLength !== undefined && value.length > validation.maxLength) {
      return `${field.label}不能超过 ${validation.maxLength} 个字符`;
    }
    if (validation.pattern && !validation.pattern.test(value)) {
      return `${field.label}格式不正确`;
    }
  }

  if (validation.custom) {
    return validation.custom(value);
  }

  return undefined;
}

// ==================== 字段组件 ====================

function FieldLabel({ 
  label, 
  required, 
  helpText 
}: { 
  label: string; 
  required?: boolean; 
  helpText?: string;
}) {
  return (
    <label className="block text-sm font-medium text-[rgb(var(--admin-text-primary))] mb-1.5">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
      {helpText && (
        <span className="block text-xs text-[rgb(var(--admin-text-muted))] font-normal mt-0.5">
          {helpText}
        </span>
      )}
    </label>
  );
}

function TextField({
  value,
  onChange,
  onBlur,
  placeholder,
  disabled,
  type = "text",
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  placeholder?: string;
  disabled?: boolean;
  type?: "text" | "email" | "password" | "number";
  error?: string;
}) {
  return (
    <Input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
    />
  );
}

function TextAreaField({
  value,
  onChange,
  onBlur,
  placeholder,
  disabled,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      disabled={disabled}
      rows={4}
      className={`
        w-full px-3 py-2 rounded-md border 
        bg-[rgb(var(--admin-bg-sidebar))] 
        text-[rgb(var(--admin-text-primary))]
        placeholder:text-[rgb(var(--admin-text-muted))]
        focus:outline-none focus:ring-2 focus:ring-[rgb(var(--admin-primary))]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${error ? "border-red-500" : "border-[rgb(var(--admin-border))]"}
      `}
    />
  );
}

function SelectField({
  value,
  onChange,
  onBlur,
  options,
  disabled,
  placeholder,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  placeholder?: string;
  error?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      disabled={disabled}
      className={`
        w-full px-3 py-2 rounded-md border 
        bg-[rgb(var(--admin-bg-sidebar))] 
        text-[rgb(var(--admin-text-primary))]
        focus:outline-none focus:ring-2 focus:ring-[rgb(var(--admin-primary))]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${error ? "border-red-500" : "border-[rgb(var(--admin-border))]"}
      `}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function CheckboxField({
  value,
  onChange,
  onBlur,
  disabled,
  label,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  onBlur: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        onBlur={onBlur}
        disabled={disabled}
        className="h-4 w-4 rounded border-[rgb(var(--admin-border))] text-[rgb(var(--admin-primary))] focus:ring-[rgb(var(--admin-primary))]"
      />
      <span className="text-sm text-[rgb(var(--admin-text-secondary))]">{label}</span>
    </label>
  );
}

// ==================== 主组件 ====================

export function FormBuilder({
  fields,
  initialData = {},
  onSubmit,
  onCancel,
  isLoading = false,
  submitText = "提交",
  cancelText = "取消",
  layout = "grid",
  columns = 2,
}: FormBuilderProps) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const defaults: Record<string, unknown> = {};
    fields.forEach((field) => {
      defaults[field.name] = initialData[field.name] ?? field.defaultValue ?? "";
    });
    return defaults;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateAll = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    fields.forEach((field) => {
      const error = validateField(field, values[field.name]);
      if (error) {
        newErrors[field.name] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [fields, values]);

  const validateFieldByName = useCallback(
    (name: string) => {
      const field = fields.find((f) => f.name === name);
      if (!field) return;

      const error = validateField(field, values[name]);
      setErrors((prev) => ({
        ...prev,
        [name]: error || "",
      }));
    },
    [fields, values]
  );

  const handleChange = useCallback((name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (touched[name]) {
      const field = fields.find((f) => f.name === name);
      if (field) {
        const error = validateField(field, value);
        setErrors((prev) => ({ ...prev, [name]: error || "" }));
      }
    }
  }, [fields, touched]);

  const handleBlur = useCallback((name: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    validateFieldByName(name);
  }, [validateFieldByName]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (validateAll()) {
        onSubmit(values);
      }
    },
    [onSubmit, values, validateAll]
  );

  const renderField = (field: FormField) => {
    const value = values[field.name];
    const error = touched[field.name] ? errors[field.name] : undefined;

    if (field.render) {
      return field.render({
        value,
        onChange: (v) => handleChange(field.name, v),
        onBlur: () => handleBlur(field.name),
        error,
        disabled: field.disabled || isLoading,
      });
    }

    switch (field.type) {
      case "text":
      case "email":
      case "password":
        return (
          <TextField
            value={String(value || "")}
            onChange={(v) => handleChange(field.name, v)}
            onBlur={() => handleBlur(field.name)}
            placeholder={field.placeholder}
            disabled={field.disabled || isLoading}
            type={field.type}
            error={error}
          />
        );
      case "number":
        return (
          <TextField
            value={String(value || "")}
            onChange={(v) => handleChange(field.name, v ? Number(v) : undefined)}
            onBlur={() => handleBlur(field.name)}
            placeholder={field.placeholder}
            disabled={field.disabled || isLoading}
            type="number"
            error={error}
          />
        );
      case "textarea":
        return (
          <TextAreaField
            value={String(value || "")}
            onChange={(v) => handleChange(field.name, v)}
            onBlur={() => handleBlur(field.name)}
            placeholder={field.placeholder}
            disabled={field.disabled || isLoading}
            error={error}
          />
        );
      case "select":
        return (
          <SelectField
            value={String(value || "")}
            onChange={(v) => handleChange(field.name, v)}
            onBlur={() => handleBlur(field.name)}
            options={field.options || []}
            disabled={field.disabled || isLoading}
            placeholder={field.placeholder || `请选择${field.label}`}
            error={error}
          />
        );
      case "checkbox":
        return (
          <CheckboxField
            value={Boolean(value)}
            onChange={(v) => handleChange(field.name, v)}
            onBlur={() => handleBlur(field.name)}
            disabled={field.disabled || isLoading}
            label={field.label}
          />
        );
      default:
        return (
          <Input
            value={String(value || "")}
            onChange={(e) => handleChange(field.name, e.target.value)}
            onBlur={() => handleBlur(field.name)}
            placeholder={field.placeholder}
            disabled={field.disabled || isLoading}
          />
        );
    }
  };

  const getColSpanClass = (colSpan?: number) => {
    if (!colSpan || layout === "stack") return "";
    return colSpan === 2 ? "md:col-span-2" : colSpan === 3 ? "md:col-span-3" : "";
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div
        className={
          layout === "grid"
            ? `grid grid-cols-1 md:grid-cols-${columns} gap-4`
            : "space-y-4"
        }
      >
        {fields.map((field) => (
          <div
            key={field.name}
            className={`space-y-1 ${getColSpanClass(field.colSpan)}`}
          >
            {field.type !== "checkbox" && (
              <FieldLabel
                label={field.label}
                required={field.required}
                helpText={field.helpText}
              />
            )}
            <div className="relative">
              {renderField(field)}
              {touched[field.name] && errors[field.name] && (
                <p className="mt-1 text-xs text-red-500">{errors[field.name]}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-[rgb(var(--admin-border))]">
        {onCancel && (
          <AdminButton
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </AdminButton>
        )}
        <AdminButton type="submit" disabled={isLoading}>
          {isLoading ? "提交中..." : submitText}
        </AdminButton>
      </div>
    </form>
  );
}

// ==================== 快捷使用 Hook ====================

export function useFormBuilder(
  fields: FormField[],
  options: {
    onSubmit: (data: Record<string, unknown>) => void;
    initialData?: Record<string, unknown>;
  }
) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingData, setEditingData] = useState<Record<string, unknown> | undefined>();

  const openCreate = useCallback(() => {
    setEditingData(undefined);
    setIsOpen(true);
  }, []);

  const openEdit = useCallback((data: Record<string, unknown>) => {
    setEditingData(data);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setEditingData(undefined);
  }, []);

  const handleSubmit = useCallback(
    (data: Record<string, unknown>) => {
      options.onSubmit(data);
    },
    [options]
  );

  return {
    isOpen,
    editingData,
    openCreate,
    openEdit,
    close,
    FormComponent: (
      <FormBuilder
        fields={fields}
        initialData={editingData || options.initialData}
        onSubmit={handleSubmit}
        onCancel={close}
      />
    ),
  };
}
