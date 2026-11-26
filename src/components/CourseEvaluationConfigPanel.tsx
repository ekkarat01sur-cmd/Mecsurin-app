import { useEffect, useMemo, useState } from 'react';
import {
  CheckSquare,
  ClipboardCheck,
  Layers,
  Lock,
  MapPin,
  Plus,
  RotateCcw,
  Square,
  Trash2,
} from 'lucide-react';
import {
  CourseGradingConfig,
  CustomEvaluationItem,
  CustomGradeGroup,
  EvaluationFormType,
  UserRole,
} from '../types/medicalSchool';
import {
  BUILT_IN_GRADE_BUCKETS,
  FORM_DEFAULT_GRADE_TARGET,
  FORM_METADATA,
  getAllCourseTopicCatalog,
  getAllMergedFormItemIds,
  getMergedFormCatalogItems,
} from '../data/evaluationFormsSchema';
import { getTotalConfiguredWeight, resolveTopicGradeTarget } from '../utils/gradeEvaluation';

interface CourseEvaluationConfigPanelProps {
  role: UserRole;
  assignedCourseCodes?: string[];
  authenticatedDisplayName?: string;
  configs: CourseGradingConfig[];
  onUpdateConfig: (updated: CourseGradingConfig) => void;
}

const ALL_FORM_TYPES: EvaluationFormType[] = [
  'form_a',
  'form_b',
  'form_c',
  'well_baby',
  'form_e',
];

export function CourseEvaluationConfigPanel({
  role,
  assignedCourseCodes,
  authenticatedDisplayName,
  configs,
  onUpdateConfig,
}: CourseEvaluationConfigPanelProps) {
  const manageableCourses = useMemo(() => {
    if (role === 'course_officer' && assignedCourseCodes && assignedCourseCodes.length > 0) {
      return configs.filter((c) => assignedCourseCodes.includes(c.courseCode));
    }
    return configs;
  }, [role, assignedCourseCodes, configs]);

  const [selectedCourseCode, setSelectedCourseCode] = useState(
    manageableCourses[0]?.courseCode ?? configs[0]?.courseCode ?? 'SUR-PED-502'
  );
  const [expandedForm, setExpandedForm] = useState<EvaluationFormType>('form_a');
  const [newSubrotation, setNewSubrotation] = useState('');

  // Custom topic form state
  const [newTopicLabel, setNewTopicLabel] = useState('');
  const [newTopicSection, setNewTopicSection] = useState('');
  const [newTopicMaxScore, setNewTopicMaxScore] = useState<number>(10);
  const [newTopicAllowNa, setNewTopicAllowNa] = useState(true);

  // New Combined Grade Group builder state
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupWeight, setNewGroupWeight] = useState<number>(10);
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupSelectedTopics, setNewGroupSelectedTopics] = useState<string[]>([]);
  const [editingGroupTopicsId, setEditingGroupTopicsId] = useState<string | null>(null);

  useEffect(() => {
    if (
      manageableCourses.length > 0 &&
      !manageableCourses.some((c) => c.courseCode === selectedCourseCode)
    ) {
      setSelectedCourseCode(manageableCourses[0].courseCode);
    }
  }, [manageableCourses, selectedCourseCode]);

  const config =
    configs.find((c) => c.courseCode === selectedCourseCode) ?? configs[0];

  const isCourseOfficerScoped =
    role === 'course_officer' &&
    Boolean(assignedCourseCodes && assignedCourseCodes.length > 0);
  const canEditSelectedCourse =
    role === 'admin' ||
    (role === 'course_officer' &&
      (!assignedCourseCodes ||
        assignedCourseCodes.length === 0 ||
        assignedCourseCodes.includes(config.courseCode)));

  useEffect(() => {
    if (config.enabledForms.length > 0 && !config.enabledForms.includes(expandedForm)) {
      setExpandedForm(config.enabledForms[0]);
    }
  }, [config.courseCode, config.enabledForms, expandedForm]);

  // Reset draft default maxScore when switching expandedForm
  useEffect(() => {
    if (expandedForm === 'well_baby') {
      setNewTopicMaxScore(4);
    } else if (expandedForm === 'form_e') {
      setNewTopicMaxScore(5);
    } else {
      setNewTopicMaxScore(10);
    }
  }, [expandedForm]);

  const toggleFormEnabled = (formType: EvaluationFormType) => {
    if (!canEditSelectedCourse) return;
    const isEnabled = config.enabledForms.includes(formType);
    if (isEnabled && config.enabledForms.length <= 1) {
      return;
    }
    const nextForms = isEnabled
      ? config.enabledForms.filter((f) => f !== formType)
      : [...config.enabledForms, formType];

    const existingItems = config.enabledItems?.[formType] ?? [];
    const nextItemsForForm =
      !isEnabled && existingItems.length === 0
        ? getAllMergedFormItemIds(formType, config)
        : existingItems;

    onUpdateConfig({
      ...config,
      enabledForms: nextForms,
      enabledItems: {
        ...config.enabledItems,
        [formType]: nextItemsForForm,
      },
    });
    if (!isEnabled) {
      setExpandedForm(formType);
    }
  };

  const toggleItemEnabled = (formType: EvaluationFormType, itemId: string) => {
    if (!canEditSelectedCourse) return;
    const current = config.enabledItems?.[formType] ?? getAllMergedFormItemIds(formType, config);
    const exists = current.includes(itemId);
    if (exists && current.length <= 1) {
      return;
    }
    const next = exists
      ? current.filter((id) => id !== itemId)
      : [...current, itemId];

    onUpdateConfig({
      ...config,
      enabledItems: {
        ...config.enabledItems,
        [formType]: next,
      },
    });
  };

  const handleSelectAllItems = (formType: EvaluationFormType) => {
    if (!canEditSelectedCourse) return;
    onUpdateConfig({
      ...config,
      enabledItems: {
        ...config.enabledItems,
        [formType]: getAllMergedFormItemIds(formType, config),
      },
    });
  };

  const handleAddCustomTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditSelectedCourse) return;
    const cleanLabel = newTopicLabel.trim();
    if (!cleanLabel) return;

    const itemId = `custom-${expandedForm}-${Date.now()}`;
    const isRubricForm = expandedForm === 'form_a' || expandedForm === 'form_c';
    const newItem: CustomEvaluationItem = {
      id: itemId,
      formType: expandedForm,
      label: cleanLabel,
      section: newTopicSection.trim() || undefined,
      maxScore: isRubricForm ? 10 : Math.max(1, Math.min(100, Math.round(newTopicMaxScore) || 10)),
      allowNa: isRubricForm ? newTopicAllowNa : false,
      createdBy: authenticatedDisplayName || role,
    };

    const existingCustom = config.customItems?.[expandedForm] ?? [];
    const existingEnabled =
      config.enabledItems?.[expandedForm] ?? getAllMergedFormItemIds(expandedForm, config);

    onUpdateConfig({
      ...config,
      customItems: {
        ...(config.customItems ?? {}),
        [expandedForm]: [...existingCustom, newItem],
      },
      enabledItems: {
        ...config.enabledItems,
        [expandedForm]: [...existingEnabled, itemId],
      },
    });

    setNewTopicLabel('');
    setNewTopicSection('');
  };

  const handleDeleteCustomTopic = (formType: EvaluationFormType, itemId: string) => {
    if (!canEditSelectedCourse) return;
    const topicKey = `${formType}:${itemId}`;
    const nextCustomList = (config.customItems?.[formType] ?? []).filter(
      (i) => i.id !== itemId
    );
    const nextEnabled = (config.enabledItems?.[formType] ?? []).filter(
      (id) => id !== itemId
    );
    const nextMapping = { ...(config.itemGradeMapping ?? {}) };
    delete nextMapping[topicKey];

    const nextGroups = (config.customGradeGroups ?? []).map((grp) => ({
      ...grp,
      includedItemIds: grp.includedItemIds.filter((id) => id !== topicKey),
    }));

    onUpdateConfig({
      ...config,
      customItems: {
        ...(config.customItems ?? {}),
        [formType]: nextCustomList,
      },
      enabledItems: {
        ...config.enabledItems,
        [formType]:
          nextEnabled.length > 0 ? nextEnabled : getAllMergedFormItemIds(formType, { customItems: { ...(config.customItems ?? {}), [formType]: nextCustomList } }),
      },
      itemGradeMapping: nextMapping,
      customGradeGroups: nextGroups,
    });
  };

  const handleTopicTargetChange = (topicKey: string, nextTarget: string) => {
    if (!canEditSelectedCourse) return;
    const formType = topicKey.split(':')[0] as EvaluationFormType;
    const defaultTarget = FORM_DEFAULT_GRADE_TARGET[formType];

    const nextMapping = { ...(config.itemGradeMapping ?? {}) };
    if (nextTarget === defaultTarget) {
      delete nextMapping[topicKey];
    } else {
      nextMapping[topicKey] = nextTarget;
    }

    // Keep customGradeGroups.includedItemIds synchronized with the mapping
    const nextGroups = (config.customGradeGroups ?? []).map((grp) => {
      const filtered = grp.includedItemIds.filter((id) => id !== topicKey);
      if (grp.id === nextTarget) {
        return { ...grp, includedItemIds: [...filtered, topicKey] };
      }
      return { ...grp, includedItemIds: filtered };
    });

    onUpdateConfig({
      ...config,
      itemGradeMapping: nextMapping,
      customGradeGroups: nextGroups,
    });
  };

  const handleToggleNewGroupTopic = (topicKey: string) => {
    setNewGroupSelectedTopics((prev) =>
      prev.includes(topicKey) ? prev.filter((id) => id !== topicKey) : [...prev, topicKey]
    );
  };

  const handleCreateGradeGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditSelectedCourse) return;
    const cleanName = newGroupName.trim();
    if (!cleanName || newGroupSelectedTopics.length === 0) return;

    const groupId = `grp-${Date.now()}`;
    const newGroup: CustomGradeGroup = {
      id: groupId,
      name: cleanName,
      weightPercent: Math.max(0, Math.min(100, Number(newGroupWeight) || 0)),
      description: newGroupDesc.trim() || undefined,
      includedItemIds: [...newGroupSelectedTopics],
    };

    const nextMapping = { ...(config.itemGradeMapping ?? {}) };
    newGroupSelectedTopics.forEach((tk) => {
      nextMapping[tk] = groupId;
    });

    // Remove these topics from any previous custom group to keep 1-to-1 clarity
    const updatedExistingGroups = (config.customGradeGroups ?? []).map((grp) => ({
      ...grp,
      includedItemIds: grp.includedItemIds.filter(
        (id) => !newGroupSelectedTopics.includes(id)
      ),
    }));

    onUpdateConfig({
      ...config,
      itemGradeMapping: nextMapping,
      customGradeGroups: [...updatedExistingGroups, newGroup],
    });

    setNewGroupName('');
    setNewGroupDesc('');
    setNewGroupWeight(10);
    setNewGroupSelectedTopics([]);
  };

  const handleUpdateGroupWeight = (groupId: string, weightPercent: number) => {
    if (!canEditSelectedCourse) return;
    const nextGroups = (config.customGradeGroups ?? []).map((grp) =>
      grp.id === groupId
        ? { ...grp, weightPercent: Math.max(0, Math.min(100, weightPercent)) }
        : grp
    );
    onUpdateConfig({ ...config, customGradeGroups: nextGroups });
  };

  const handleToggleTopicInGroup = (groupId: string, topicKey: string) => {
    if (!canEditSelectedCourse) return;
    const targetGroup = (config.customGradeGroups ?? []).find((g) => g.id === groupId);
    if (!targetGroup) return;
    const isCurrentlyIn = targetGroup.includedItemIds.includes(topicKey);

    const nextMapping = { ...(config.itemGradeMapping ?? {}) };
    if (isCurrentlyIn) {
      if (nextMapping[topicKey] === groupId) {
        delete nextMapping[topicKey];
      }
    } else {
      nextMapping[topicKey] = groupId;
    }

    const nextGroups = (config.customGradeGroups ?? []).map((grp) => {
      if (grp.id === groupId) {
        return {
          ...grp,
          includedItemIds: isCurrentlyIn
            ? grp.includedItemIds.filter((id) => id !== topicKey)
            : [...grp.includedItemIds, topicKey],
        };
      }
      if (!isCurrentlyIn) {
        return {
          ...grp,
          includedItemIds: grp.includedItemIds.filter((id) => id !== topicKey),
        };
      }
      return grp;
    });

    onUpdateConfig({
      ...config,
      itemGradeMapping: nextMapping,
      customGradeGroups: nextGroups,
    });
  };

  const handleDeleteGradeGroup = (groupId: string) => {
    if (!canEditSelectedCourse) return;
    const nextMapping = { ...(config.itemGradeMapping ?? {}) };
    Object.keys(nextMapping).forEach((tk) => {
      if (nextMapping[tk] === groupId) {
        delete nextMapping[tk];
      }
    });
    const nextGroups = (config.customGradeGroups ?? []).filter((g) => g.id !== groupId);
    onUpdateConfig({
      ...config,
      itemGradeMapping: nextMapping,
      customGradeGroups: nextGroups,
    });
    if (editingGroupTopicsId === groupId) {
      setEditingGroupTopicsId(null);
    }
  };

  const handleAddSubrotation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditSelectedCourse) return;
    const clean = newSubrotation.trim();
    if (!clean || config.subrotations.includes(clean)) return;
    onUpdateConfig({
      ...config,
      subrotations: [...config.subrotations, clean],
    });
    setNewSubrotation('');
  };

  const handleRemoveSubrotation = (label: string) => {
    if (!canEditSelectedCourse || config.subrotations.length <= 1) return;
    onUpdateConfig({
      ...config,
      subrotations: config.subrotations.filter((s) => s !== label),
    });
  };

  const catalogItems = getMergedFormCatalogItems(expandedForm, config);
  const activeItemIds =
    config.enabledItems?.[expandedForm] ?? getAllMergedFormItemIds(expandedForm, config);
  const isExpandedFormEnabled = config.enabledForms.includes(expandedForm);

  const allCourseTopics = useMemo(() => getAllCourseTopicCatalog(config), [config]);
  const topicsByForm = useMemo(() => {
    const map = new Map<EvaluationFormType, typeof allCourseTopics>();
    allCourseTopics.forEach((t) => {
      const list = map.get(t.formType) ?? [];
      list.push(t);
      map.set(t.formType, list);
    });
    return map;
  }, [allCourseTopics]);

  const customGradeGroups = config.customGradeGroups ?? [];
  const totalWeightPercent = getTotalConfiguredWeight(config);

  return (
    <div className="space-y-8">
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-[#0F2A4A]" aria-hidden="true" />
              กำหนดโครงสร้างแบบประเมิน เพิ่มหัวข้อประเมิน และจัดกลุ่มรวมคะแนนคิดเกรด
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              อาจารย์แพทย์ นักวิชาการประจำวิชา และแอดมิน สามารถเพิ่มหัวข้อในแบบประเมินต่างๆ และกำหนดได้ว่าหัวข้อใดนำไปรวมคะแนนกับหัวข้อใดเพื่อคิดเกรด
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {isCourseOfficerScoped && (
              <span className="text-xs font-medium text-[#0F766E] px-2.5 py-1.5 bg-teal-50 border border-teal-200 rounded-lg">
                ขอบเขตนักวิชาการประจำวิชา: {assignedCourseCodes?.join(', ')}
              </span>
            )}
            <select
              value={config.courseCode}
              onChange={(e) => setSelectedCourseCode(e.target.value)}
              aria-label="เลือกรายวิชาที่ต้องการตั้งค่าแบบประเมิน"
              className="px-3.5 py-2 text-sm font-medium bg-white border border-slate-300 rounded-lg min-h-[44px]"
            >
              {(isCourseOfficerScoped ? manageableCourses : configs).map((c) => (
                <option key={c.courseCode} value={c.courseCode}>
                  {c.courseCode} · {c.courseName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!canEditSelectedCourse && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2.5 text-xs text-slate-700">
            <Lock className="w-4 h-4 mt-0.5 text-slate-500 shrink-0" aria-hidden="true" />
            <span>
              การแก้ไขชุดแบบประเมินและหัวข้อประเมินสงวนสิทธิ์เฉพาะ{' '}
              <span className="font-semibold text-slate-900">
                อาจารย์แพทย์ นักวิชาการประจำรายวิชา หรือ แอดมิน
              </span>{' '}
              เท่านั้น
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Form Checklist + Ward/Subrotation Manager */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  1. เลือกแบบประเมินที่ใช้ในวิชา {config.courseCode}
                </h3>
                <span className="text-xs font-mono text-slate-500 tabular-nums">
                  เลือก {config.enabledForms.length} / {ALL_FORM_TYPES.length} ฟอร์ม
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl divide-y divide-slate-200 overflow-hidden">
                {ALL_FORM_TYPES.map((formType) => {
                  const meta = FORM_METADATA[formType];
                  const isChecked = config.enabledForms.includes(formType);
                  const allIds = getAllMergedFormItemIds(formType, config);
                  const totalItems = allIds.length;
                  const customCount = (config.customItems?.[formType] ?? []).length;
                  const enabledCount = (config.enabledItems?.[formType] ?? allIds).length;
                  const isFocused = expandedForm === formType;

                  return (
                    <div
                      key={formType}
                      className={`p-3.5 transition-colors flex items-start justify-between gap-3 ${
                        isFocused ? 'bg-[#0F2A4A]/5' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <button
                          type="button"
                          disabled={!canEditSelectedCourse}
                          onClick={() => toggleFormEnabled(formType)}
                          aria-label={`เปิด/ปิด ${meta.shortName}`}
                          className="mt-0.5 text-[#0F2A4A] disabled:opacity-45 cursor-pointer disabled:cursor-not-allowed shrink-0"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setExpandedForm(formType)}
                            className="text-left text-xs sm:text-sm font-semibold text-slate-900 hover:text-[#0F2A4A] cursor-pointer"
                          >
                            {meta.shortName}
                          </button>
                          <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            {meta.description}
                          </div>
                          <div className="text-[11px] font-mono mt-1 tabular-nums flex flex-wrap items-center gap-2">
                            {isChecked ? (
                              <span className="text-emerald-700 font-medium">
                                เปิดใช้ {enabledCount}/{totalItems} หัวข้อ
                              </span>
                            ) : (
                              <span className="text-slate-400">ไม่ได้เปิดใช้ในรายวิชานี้</span>
                            )}
                            {customCount > 0 && (
                              <span className="text-[#0F2A4A] font-sans font-semibold">
                                (+เพิ่มเอง {customCount} ข้อ)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedForm(formType)}
                        className={`px-2.5 py-1.5 text-[11px] font-medium rounded-md border shrink-0 cursor-pointer whitespace-nowrap ${
                          isFocused
                            ? 'bg-[#0F2A4A] text-white border-[#0F2A4A]'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        ตั้งหัวข้อ
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ward / Sub-rotation List */}
            <div className="space-y-3 border border-slate-200 rounded-xl p-4 bg-slate-50/70">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#0F2A4A]" aria-hidden="true" />
                  รายชื่อ Ward / Sub-rotation ประจำวิชา
                </h3>
                <span className="text-xs text-slate-500 tabular-nums">
                  {config.subrotations.length} จุดฝึก
                </span>
              </div>

              <div className="space-y-1.5">
                {config.subrotations.map((ward) => (
                  <div
                    key={ward}
                    className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  >
                    <span className="text-slate-800 font-medium">{ward}</span>
                    {canEditSelectedCourse && config.subrotations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSubrotation(ward)}
                        aria-label={`ลบ ${ward}`}
                        className="text-slate-400 hover:text-rose-700 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {canEditSelectedCourse && (
                <form onSubmit={handleAddSubrotation} className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newSubrotation}
                    onChange={(e) => setNewSubrotation(e.target.value)}
                    placeholder="เพิ่ม Ward / Sub-rotation ใหม่..."
                    className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-white bg-[#0F2A4A] rounded-lg hover:bg-[#163B66] cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    เพิ่ม
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right: Topic/Item Checklist + Custom Topic Builder + Per-Topic Grade Target */}
          <div className="lg:col-span-7 border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-mono text-[#0F2A4A] font-semibold">
                  {config.courseCode} · {FORM_METADATA[expandedForm].shortName}
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mt-0.5">
                  2. เลือก / เพิ่มหัวข้อประเมิน และเลือกกลุ่มคะแนนที่ใช้คิดเกรด
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-600 tabular-nums">
                  {activeItemIds.length} / {catalogItems.length} หัวข้อ
                </span>
                {canEditSelectedCourse && (
                  <button
                    type="button"
                    onClick={() => handleSelectAllItems(expandedForm)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#0F2A4A] bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="w-3 h-3" aria-hidden="true" />
                    เลือกครบทุกข้อ
                  </button>
                )}
              </div>
            </div>

            {!isExpandedFormEnabled && (
              <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 text-xs text-amber-900">
                แบบประเมิน <span className="font-semibold">{FORM_METADATA[expandedForm].shortName}</span> ยังไม่ได้เปิดใช้งานในรายวิชา {config.courseCode} (ติ๊กเปิดใช้งานด้านซ้ายเพื่อให้แบบฟอร์มนี้แสดงในหน้ากรอกคะแนนอาจารย์)
              </div>
            )}

            {/* Inline Add Custom Topic Builder */}
            {canEditSelectedCourse && (
              <form
                onSubmit={handleAddCustomTopic}
                className="px-5 py-4 bg-[#0F2A4A]/[0.03] border-b border-slate-200 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#0F2A4A] flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    เพิ่มหัวข้อประเมินใหม่ใน {FORM_METADATA[expandedForm].shortName}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    หัวข้อที่เพิ่มจะขึ้นในตารางกรอกคะแนนอาจารย์ทันที
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-6">
                    <input
                      type="text"
                      required
                      value={newTopicLabel}
                      onChange={(e) => setNewTopicLabel(e.target.value)}
                      placeholder="ชื่อหัวข้อประเมิน เช่น การทำ Lumbar Puncture หรือ การสื่อสารญาติ..."
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      value={newTopicSection}
                      onChange={(e) => setNewTopicSection(e.target.value)}
                      placeholder="หมวดย่อย (ถ้ามี)"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="sm:col-span-3 flex items-center gap-2">
                    {expandedForm === 'form_a' || expandedForm === 'form_c' ? (
                      <label className="flex items-center gap-1.5 text-[11px] text-slate-700 whitespace-nowrap cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newTopicAllowNa}
                          onChange={(e) => setNewTopicAllowNa(e.target.checked)}
                          className="w-3.5 h-3.5 accent-[#0F2A4A]"
                        />
                        <span>Rubric 4–10 (มี N/A)</span>
                      </label>
                    ) : (
                      <div className="flex items-center gap-1.5 w-full">
                        <span className="text-[11px] text-slate-500 whitespace-nowrap">เต็ม</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={newTopicMaxScore}
                          onChange={(e) => setNewTopicMaxScore(Number(e.target.value))}
                          aria-label="คะแนนเต็มหัวข้อใหม่"
                          className="w-16 px-2 py-1.5 text-xs font-mono text-right bg-white border border-slate-300 rounded-lg tabular-nums"
                        />
                      </div>
                    )}
                    <button
                      type="submit"
                      className="px-3 py-2 text-xs font-medium text-white bg-[#0F2A4A] rounded-lg hover:bg-[#163B66] cursor-pointer whitespace-nowrap shrink-0 ml-auto"
                    >
                      + เพิ่มหัวข้อ
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="divide-y divide-slate-200 max-h-[540px] overflow-y-auto">
              {catalogItems.map((item) => {
                const checked = activeItemIds.includes(item.id);
                const mappedTarget = resolveTopicGradeTarget(item.topicKey, config);
                const defaultTarget = FORM_DEFAULT_GRADE_TARGET[expandedForm];
                const isRemapped = mappedTarget !== defaultTarget;

                return (
                  <div
                    key={item.id}
                    className={`px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      checked ? 'bg-white' : 'bg-slate-50/60 opacity-75'
                    }`}
                  >
                    <label
                      className={`flex items-start gap-3 flex-1 min-w-0 ${
                        canEditSelectedCourse ? 'cursor-pointer' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={!canEditSelectedCourse}
                        checked={checked}
                        onChange={() => toggleItemEnabled(expandedForm, item.id)}
                        className="mt-0.5 w-4 h-4 accent-[#0F2A4A] shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {item.section && (
                            <span className="text-[11px] font-medium text-slate-500">
                              {item.section}
                            </span>
                          )}
                          {item.isCustom && (
                            <span className="text-[11px] font-semibold text-[#0F766E]">
                              [หัวข้อเพิ่มเอง]
                            </span>
                          )}
                        </div>
                        <div className="text-xs sm:text-sm font-medium text-slate-900">
                          {item.label}
                        </div>
                      </div>
                    </label>

                    <div className="flex items-center gap-2 shrink-0 pl-7 sm:pl-0">
                      <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap tabular-nums">
                        {item.maxScoreLabel}
                      </span>

                      {!item.isPassFailGate && (
                        <select
                          disabled={!canEditSelectedCourse}
                          value={mappedTarget}
                          aria-label={`เลือกกลุ่มรวมคะแนนของ ${item.label}`}
                          onChange={(e) =>
                            handleTopicTargetChange(item.topicKey, e.target.value)
                          }
                          className={`px-2 py-1 text-[11px] rounded-md border max-w-[185px] disabled:bg-slate-100 ${
                            isRemapped
                              ? 'bg-teal-50 border-teal-300 text-[#0F766E] font-medium'
                              : 'bg-white border-slate-300 text-slate-700'
                          }`}
                        >
                          <optgroup label="องค์ประกอบมาตรฐานของรายวิชา">
                            {BUILT_IN_GRADE_BUCKETS.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.id === defaultTarget
                                  ? `รวมเข้า: ${b.shortLabel} (ค่าเริ่มต้น)`
                                  : `ย้ายไปรวม: ${b.shortLabel}`}
                              </option>
                            ))}
                          </optgroup>
                          {customGradeGroups.length > 0 && (
                            <optgroup label="กลุ่มคะแนนรวมที่สร้างเอง">
                              {customGradeGroups.map((grp) => (
                                <option key={grp.id} value={grp.id}>
                                  กลุ่ม: {grp.name} ({grp.weightPercent}%)
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      )}

                      {item.isCustom && canEditSelectedCourse && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomTopic(expandedForm, item.id)}
                          aria-label={`ลบหัวข้อ ${item.label}`}
                          className="p-1 text-slate-400 hover:text-rose-700 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 3: Custom Combined Grade Groups Builder */}
        <div className="pt-4 border-t border-slate-200 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#0F2A4A]" aria-hidden="true" />
                3. จัดกลุ่มรวมคะแนนหัวข้อข้ามแบบฟอร์มเพื่อคิดเกรด ({config.courseCode})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                เลือกหัวข้อจากแบบประเมินใดก็ได้ (Form A, Form B, Form C, Well Baby, Form E หรือหัวข้อที่สร้างใหม่) มารวมคะแนนเป็นกลุ่มใหม่และกำหนดน้ำหนัก % เพื่อใช้คำนวณเกรด MPL
              </p>
            </div>
            <div
              className={`text-xs font-mono font-bold tabular-nums ${
                totalWeightPercent === 100 ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              น้ำหนักรวมปัจจุบัน (หลัก + กลุ่มใหม่): {totalWeightPercent}% / 100%
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Existing Custom Grade Groups */}
            <div className="lg:col-span-6 space-y-3">
              <div className="text-xs font-semibold text-slate-700">
                กลุ่มคะแนนรวมที่กำหนดไว้ ({customGradeGroups.length} กลุ่ม)
              </div>

              {customGradeGroups.length === 0 ? (
                <div className="p-5 border border-dashed border-slate-300 rounded-xl bg-slate-50/70 text-xs text-slate-500">
                  ยังไม่มีกลุ่มคะแนนรวมเพิ่มเติม — ท่านสามารถเลือกสร้างกลุ่มด้านขวา หรือใช้ตัวเลือก &ldquo;ย้ายไปรวม&rdquo; ในแต่ละหัวข้อด้านบนเพื่อนำคะแนนมารวมกันได้ทันที
                </div>
              ) : (
                <div className="space-y-3">
                  {customGradeGroups.map((grp) => {
                    const isEditingTopics = editingGroupTopicsId === grp.id;
                    return (
                      <div
                        key={grp.id}
                        className="border border-slate-200 rounded-xl p-4 bg-white space-y-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {grp.name}
                            </div>
                            {grp.description && (
                              <div className="text-xs text-slate-500 mt-0.5">
                                {grp.description}
                              </div>
                            )}
                            <div className="text-[11px] font-mono text-[#0F766E] mt-1 tabular-nums">
                              รวม {grp.includedItemIds.length} หัวข้อข้ามแบบฟอร์ม
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <label className="flex items-center gap-1.5 text-xs text-slate-600">
                              <span>น้ำหนัก</span>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                disabled={!canEditSelectedCourse}
                                value={grp.weightPercent}
                                onChange={(e) =>
                                  handleUpdateGroupWeight(grp.id, Number(e.target.value))
                                }
                                className="w-16 px-2 py-1 font-mono text-right bg-white border border-slate-300 rounded-md tabular-nums disabled:bg-slate-100"
                              />
                              <span>%</span>
                            </label>
                            {canEditSelectedCourse && (
                              <button
                                type="button"
                                onClick={() => handleDeleteGradeGroup(grp.id)}
                                aria-label={`ลบกลุ่ม ${grp.name}`}
                                className="p-1.5 text-slate-400 hover:text-rose-700 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* List of Included Topics */}
                        <div className="flex flex-wrap gap-1.5">
                          {grp.includedItemIds.map((tk) => {
                            const found = allCourseTopics.find((t) => t.topicKey === tk);
                            if (!found) return null;
                            return (
                              <span
                                key={tk}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] bg-slate-100 text-slate-800 rounded-md border border-slate-200"
                              >
                                <span className="font-mono text-[#0F2A4A] font-semibold">
                                  {FORM_METADATA[found.formType].shortName.split(' ')[0]}
                                </span>
                                <span className="truncate max-w-[180px]">{found.label}</span>
                              </span>
                            );
                          })}
                        </div>

                        {canEditSelectedCourse && (
                          <div>
                            <button
                              type="button"
                              onClick={() =>
                                setEditingGroupTopicsId(isEditingTopics ? null : grp.id)
                              }
                              className="text-xs font-medium text-[#0F2A4A] hover:underline cursor-pointer"
                            >
                              {isEditingTopics
                                ? 'ซ่อนรายการเลือกหัวข้อ'
                                : 'ปรับเลือกหัวข้อที่นำมารวมในกลุ่มนี้'}
                            </button>

                            {isEditingTopics && (
                              <div className="mt-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg max-h-56 overflow-y-auto space-y-2.5">
                                {ALL_FORM_TYPES.map((ft) => {
                                  const items = topicsByForm.get(ft) ?? [];
                                  if (items.length === 0) return null;
                                  return (
                                    <div key={ft} className="space-y-1">
                                      <div className="text-[11px] font-semibold text-[#0F2A4A]">
                                        {FORM_METADATA[ft].shortName}
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                        {items.map((topic) => {
                                          const checked = grp.includedItemIds.includes(
                                            topic.topicKey
                                          );
                                          return (
                                            <label
                                              key={topic.topicKey}
                                              className="flex items-start gap-2 text-[11px] text-slate-700 cursor-pointer hover:text-slate-950"
                                            >
                                              <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() =>
                                                  handleToggleTopicInGroup(
                                                    grp.id,
                                                    topic.topicKey
                                                  )
                                                }
                                                className="mt-0.5 w-3.5 h-3.5 accent-[#0F2A4A]"
                                              />
                                              <span className="leading-snug">{topic.label}</span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Create New Combined Grade Group Form */}
            {canEditSelectedCourse && (
              <form
                onSubmit={handleCreateGradeGroup}
                className="lg:col-span-6 border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-3.5"
              >
                <div className="text-xs font-semibold text-slate-900">
                  สร้างกลุ่มคะแนนรวมใหม่ (ดึงหัวข้อจากหลายแบบประเมินมารวมคิดเกรด)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-8">
                    <label className="block text-[11px] text-slate-600 mb-1">
                      ชื่อกลุ่มคะแนนสำหรับคิดเกรด *
                    </label>
                    <input
                      type="text"
                      required
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="เช่น ทักษะคลินิกและหัตถการรวม (Form A + B)"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] text-slate-600 mb-1">
                      น้ำหนักในเกรด (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={newGroupWeight}
                      onChange={(e) => setNewGroupWeight(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs font-mono text-right bg-white border border-slate-300 rounded-lg tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">
                    คำอธิบายกลุ่มคะแนน (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    placeholder="เช่น รวมคะแนนซักประวัติ ตรวจร่างกาย และหัตถการจากทุกวอร์ด..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium text-slate-700">
                      เลือกหัวข้อที่ต้องการนำมารวมคะแนนเข้ากลุ่มนี้ ({newGroupSelectedTopics.length} หัวข้อ)
                    </span>
                    {newGroupSelectedTopics.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setNewGroupSelectedTopics([])}
                        className="text-slate-500 hover:text-slate-800 underline cursor-pointer"
                      >
                        ล้างที่เลือก
                      </button>
                    )}
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-3 max-h-56 overflow-y-auto space-y-3">
                    {ALL_FORM_TYPES.map((ft) => {
                      const items = topicsByForm.get(ft) ?? [];
                      if (items.length === 0) return null;
                      return (
                        <div key={ft} className="space-y-1">
                          <div className="text-[11px] font-semibold text-[#0F2A4A] border-b border-slate-100 pb-0.5">
                            {FORM_METADATA[ft].shortName}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                            {items.map((topic) => {
                              const checked = newGroupSelectedTopics.includes(topic.topicKey);
                              return (
                                <label
                                  key={topic.topicKey}
                                  className="flex items-start gap-2 text-[11px] text-slate-700 cursor-pointer hover:text-slate-950"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => handleToggleNewGroupTopic(topic.topicKey)}
                                    className="mt-0.5 w-3.5 h-3.5 accent-[#0F2A4A] shrink-0"
                                  />
                                  <span className="leading-snug">
                                    {topic.label}{' '}
                                    {topic.isCustom && (
                                      <span className="text-[#0F766E] font-medium">(เพิ่มเอง)</span>
                                    )}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!newGroupName.trim() || newGroupSelectedTopics.length === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0F2A4A] rounded-lg hover:bg-[#163B66] disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    สร้างกลุ่มรวมคะแนนเพื่อคิดเกรด
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
