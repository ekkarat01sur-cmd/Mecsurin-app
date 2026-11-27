import { useMemo, useRef, useState } from 'react';
import { Camera, Check, Pencil, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { PRESET_MEMBER_PORTRAITS } from '../../data/initialMedicalData';
import {
  compressAvatarFileToDataUrl,
  sanitizeAvatarUrlInput,
} from '../../utils/imageUtils';
import { StudentAvatar } from '../StudentAvatar';

export type CrudFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'checkbox'
  | 'date'
  | 'lines'
  | 'image';

export interface CrudFieldOption {
  value: string;
  label: string;
}

export interface CrudFieldDef {
  key: string;
  label: string;
  type: CrudFieldType;
  required?: boolean;
  placeholder?: string;
  options?: CrudFieldOption[];
  min?: number;
  max?: number;
  step?: number;
  colSpan?: 1 | 2;
  readOnlyOnEdit?: boolean;
}

export interface AdminEntityCrudListProps<T> {
  title: string;
  subtitle: string;
  items: T[];
  getId: (item: T) => string;
  getTitle: (item: T) => string;
  getMeta: (item: T) => string;
  getBadge?: (item: T) => string;
  getAvatarUrl?: (item: T) => string | undefined;
  getAvatarName?: (item: T) => string;
  fields: CrudFieldDef[];
  createDefaults: () => Record<string, string | number | boolean>;
  toFormValues: (item: T) => Record<string, string | number | boolean>;
  fromFormValues: (
    values: Record<string, string | number | boolean>,
    existing?: T
  ) => T;
  onCreate: (item: T) => void;
  onUpdate: (item: T) => void;
  onDelete: (id: string) => void;
}

export function AdminEntityCrudList<T>({
  title,
  subtitle,
  items,
  getId,
  getTitle,
  getMeta,
  getBadge,
  getAvatarUrl,
  getAvatarName,
  fields,
  createDefaults,
  toFormValues,
  fromFormValues,
  onCreate,
  onUpdate,
  onDelete,
}: AdminEntityCrudListProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [formMode, setFormMode] = useState<'closed' | 'create' | 'edit'>('closed');
  const [editingItem, setEditingItem] = useState<T | undefined>(undefined);
  const [draft, setDraft] = useState<Record<string, string | number | boolean>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        getTitle(item).toLowerCase().includes(q) ||
        getMeta(item).toLowerCase().includes(q) ||
        (getBadge ? getBadge(item).toLowerCase().includes(q) : false)
    );
  }, [items, searchQuery, getTitle, getMeta, getBadge]);

  const openCreateForm = () => {
    setFormError(null);
    setEditingItem(undefined);
    setDraft(createDefaults());
    setFormMode('create');
    setConfirmDeleteId(null);
  };

  const openEditForm = (item: T) => {
    setFormError(null);
    setEditingItem(item);
    setDraft(toFormValues(item));
    setFormMode('edit');
    setConfirmDeleteId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    for (const field of fields) {
      if (field.required && field.type !== 'checkbox') {
        const val = draft[field.key];
        if (val === undefined || val === null || String(val).trim() === '') {
          setFormError(`กรุณาระบุข้อมูล "${field.label}"`);
          return;
        }
      }
      if (field.type === 'image') {
        const raw = String(draft[field.key] ?? '').trim();
        if (raw && !sanitizeAvatarUrlInput(raw)) {
          setFormError(`ลิงก์ "${field.label}" ไม่ถูกต้อง (รองรับ https://, http://, ./, / หรือไฟล์อัปโหลด)`);
          return;
        }
      }
    }
    const built = fromFormValues(draft, editingItem);
    if (formMode === 'create') {
      onCreate(built);
    } else if (formMode === 'edit') {
      onUpdate(built);
    }
    setFormMode('closed');
    setEditingItem(undefined);
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5">
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-semibold text-slate-900">
            {title} <span className="font-mono text-xs text-[#0F766E]">({items.length})</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="relative">
            <Search
              className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหารายการ..."
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg w-44 sm:w-52"
            />
          </div>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0F766E] hover:bg-[#0D625C] rounded-lg cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>เพิ่มรายการใหม่</span>
          </button>
        </div>
      </div>

      {/* Inline Create / Edit Form */}
      {formMode !== 'closed' && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border-2 border-[#0F2A4A]/20 rounded-xl p-4 sm:p-5 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
            <div className="text-xs sm:text-sm font-semibold text-[#0F2A4A]">
              {formMode === 'create'
                ? `เพิ่มข้อมูลใหม่ — ${title}`
                : `แก้ไขข้อมูล — ${editingItem ? getTitle(editingItem) : ''}`}
            </div>
            <button
              type="button"
              onClick={() => {
                setFormMode('closed');
                setEditingItem(undefined);
              }}
              className="text-slate-500 hover:text-slate-900 p-1 rounded cursor-pointer"
              aria-label="ปิดฟอร์ม"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map((field) => {
              const value = draft[field.key];
              const isLocked = formMode === 'edit' && Boolean(field.readOnlyOnEdit);
              const spanClass =
                field.colSpan === 2 ||
                field.type === 'textarea' ||
                field.type === 'lines' ||
                field.type === 'image'
                  ? 'sm:col-span-2'
                  : '';

              if (field.type === 'image') {
                const currentUrl = String(value ?? '');
                const previewName =
                  String(draft.fullName ?? draft.studentName ?? draft.displayName ?? '') ||
                  'สมาชิก';

                return (
                  <div key={field.key} className={spanClass}>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      {field.label}
                    </label>
                    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <StudentAvatar
                            photoUrl={currentUrl}
                            studentName={previewName}
                            size="md"
                          />
                          <div className="text-[11px] text-slate-600">
                            <div className="font-medium text-slate-800 flex items-center gap-1">
                              <Camera className="w-3.5 h-3.5 text-[#08347A]" aria-hidden="true" />
                              <span>ตัวอย่างรูปประจำตัว</span>
                            </div>
                            <div className="text-slate-500">
                              อัปโหลดไฟล์ วางลิงก์ URL หรือเลือกรูปมาตรฐาน
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            ref={imageFileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              e.target.value = '';
                              if (!file) return;
                              try {
                                setFormError(null);
                                const compressed = await compressAvatarFileToDataUrl(file, 320, 0.84);
                                setDraft((prev) => ({ ...prev, [field.key]: compressed }));
                              } catch (err) {
                                setFormError(
                                  err instanceof Error ? err.message : 'ไม่สามารถอัปโหลดรูปภาพได้'
                                );
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => imageFileInputRef.current?.click()}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-white bg-[#08347A] hover:bg-[#0D58CF] rounded-md cursor-pointer"
                          >
                            <Upload className="w-3 h-3" aria-hidden="true" />
                            <span>อัปโหลดรูป</span>
                          </button>
                          {currentUrl.trim() && (
                            <button
                              type="button"
                              onClick={() =>
                                setDraft((prev) => ({ ...prev, [field.key]: '' }))
                              }
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-md cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" aria-hidden="true" />
                              <span>ลบรูป</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <input
                          type="text"
                          value={currentUrl}
                          onChange={(e) =>
                            setDraft((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                          placeholder="วาง URL รูปภาพ (https://... หรือ ./src/assets/...)"
                          className="flex-1 px-2.5 py-1.5 text-[11px] font-mono bg-white border border-slate-300 rounded-md"
                        />
                        <div className="flex flex-wrap items-center gap-1">
                          {PRESET_MEMBER_PORTRAITS.map((preset) => (
                            <button
                              key={preset.url}
                              type="button"
                              onClick={() =>
                                setDraft((prev) => ({ ...prev, [field.key]: preset.url }))
                              }
                              className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md border cursor-pointer ${
                                currentUrl === preset.url
                                  ? 'bg-[#08347A] text-white border-[#08347A]'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <img
                                src={preset.url}
                                alt={preset.label}
                                className="w-4 h-4 rounded-sm object-cover object-top"
                              />
                              <span>{preset.label.replace('แพทย์/นักศึกษา', '')}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              if (field.type === 'checkbox') {
                return (
                  <div key={field.key} className={`flex items-center pt-1 ${spanClass}`}>
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            [field.key]: e.target.checked,
                          }))
                        }
                        className="rounded border-slate-300 text-[#0F766E]"
                      />
                      <span>{field.label}</span>
                    </label>
                  </div>
                );
              }

              return (
                <div key={field.key} className={spanClass}>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {field.label}
                    {field.required && <span className="text-rose-600 ml-0.5">*</span>}
                  </label>
                  {field.type === 'textarea' || field.type === 'lines' ? (
                    <textarea
                      rows={field.type === 'lines' ? 3 : 2}
                      required={field.required}
                      disabled={isLocked}
                      value={String(value ?? '')}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      placeholder={
                        field.placeholder ??
                        (field.type === 'lines'
                          ? 'แยกแต่ละรายการด้วยการขึ้นบรรทัดใหม่'
                          : '')
                      }
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg disabled:bg-slate-100"
                    />
                  ) : field.type === 'select' ? (
                    <select
                      required={field.required}
                      disabled={isLocked}
                      value={String(value ?? '')}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg disabled:bg-slate-100"
                    >
                      {(field.options ?? []).map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                      required={field.required}
                      disabled={isLocked}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={value === undefined ? '' : String(value)}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          [field.key]:
                            field.type === 'number' ? Number(e.target.value) : e.target.value,
                        }))
                      }
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg disabled:bg-slate-100"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {formError && (
            <div className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {formError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setFormMode('closed');
                setEditingItem(undefined);
              }}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#091A32] hover:bg-[#0F2A4A] rounded-lg cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{formMode === 'create' ? 'สร้างรายการ' : 'บันทึกการแก้ไข'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Items Directory */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
        <div className="divide-y divide-slate-200 max-h-[380px] overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs text-slate-500">
              ไม่พบรายการข้อมูลในหมวดนี้
            </div>
          ) : (
            filteredItems.map((item) => {
              const id = getId(item);
              const badge = getBadge?.(item);
              const isConfirmingDelete = confirmDeleteId === id;

              return (
                <div
                  key={id}
                  className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs hover:bg-slate-50/70"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {getAvatarUrl && (
                      <StudentAvatar
                        photoUrl={getAvatarUrl(item)}
                        studentName={getAvatarName ? getAvatarName(item) : getTitle(item)}
                        size="sm"
                      />
                    )}
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {badge && (
                          <span className="font-mono font-semibold text-[#0F766E]">
                            {badge}
                          </span>
                        )}
                        <span className="font-semibold text-slate-900 break-words">
                          {getTitle(item)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 break-words">
                        {getMeta(item)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => openEditForm(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#0F2A4A] bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer whitespace-nowrap"
                    >
                      <Pencil className="w-3 h-3" aria-hidden="true" />
                      <span>แก้ไข</span>
                    </button>

                    {isConfirmingDelete ? (
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            onDelete(id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2.5 py-1.5 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-md cursor-pointer whitespace-nowrap"
                        >
                          ยืนยันลบ
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded-md cursor-pointer"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-md cursor-pointer whitespace-nowrap"
                      >
                        <Trash2 className="w-3 h-3" aria-hidden="true" />
                        <span>ลบ</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
