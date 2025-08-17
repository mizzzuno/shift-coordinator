// シフトタイプの定義
export const SHIFT_TYPES = {
  EARLY: { code: "早", name: "早番", color: "#e3f2fd" },
  DAY: { code: "日", name: "日勤", color: "#fff3e0" },
  LATE: { code: "遅", name: "遅番", color: "#fce4ec" },
  NIGHT: { code: "夜", name: "夜勤", color: "#e8f5e8" },
  MORNING_OFF: { code: "明", name: "夜勤明け", color: "#f3e5f5" },
  AM_ONLY: { code: "AM", name: "午前のみ", color: "#e1f5fe" },
  PM_ONLY: { code: "PM", name: "午後のみ", color: "#f9fbe7" },
  OFF: { code: "休", name: "休日", color: "#fafafa" },
};

// 職種の定義
export const JOB_TYPES = {
  NURSE: { code: "NS", name: "看護師", color: "#e8f5e8" },
  CAREGIVER: { code: "CG", name: "介護士", color: "#e3f2fd" },
  PART_TIME: { code: "PT", name: "パート", color: "#fff3e0" },
  ADMIN: { code: "AD", name: "事務", color: "#fce4ec" },
};

// 雇用形態の定義
export const EMPLOYMENT_TYPES = {
  FULL_TIME: { code: "FT", name: "正社員" },
  PART_TIME: { code: "PT", name: "パートタイマー" },
};

// シフトルールの定義
export const SHIFT_RULES = {
  // 各シフトに必要な最小人数とスキル要件
  EARLY: {
    minStaff: 2,
    requiredSkills: ["NURSE", "CAREGIVER"], // 看護師1名、介護士1名必須
    description: "早番：看護師1名、介護士1名必須",
    mandatory: true,
  },
  DAY: {
    minStaff: 2,
    requiredSkills: ["NURSE", "CAREGIVER"], // 看護師1名、介護士1名必須（パート1名可）
    description: "日勤：看護師1名、介護士1名必須",
    mandatory: true,
    allowPartAsNurse: true, // パートタイマーが看護師として勤務可能
  },
  LATE: {
    minStaff: 1,
    requiredSkills: ["NURSE_OR_CAREGIVER"], // 看護師または介護士1名必須
    description: "遅番：看護師または介護士1名必須",
    mandatory: true,
  },
  NIGHT: {
    minStaff: 2,
    requiredSkills: ["NURSE", "CAREGIVER"], // 看護師1名、介護士1名必須
    description: "夜勤：看護師1名、介護士1名必須",
    mandatory: true,
  },
  PM_ONLY: {
    minStaff: 1,
    requiredSkills: ["PART_TIME"], // パートタイマー必須
    description: "午後のみ：パートタイマー1名必須",
    mandatory: true,
    partTimerRule: true,
  },
};

// 曜日の定義
export const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// デフォルトの勤務パターン制約
export const DEFAULT_CONSTRAINTS = {
  maxConsecutiveWorkDays: 5, // 連続勤務日数の上限
  maxNightShiftsPerWeek: 2, // 週の夜勤回数上限
  minRestHoursAfterNight: 24, // 夜勤後の最低休息時間
  maxShiftsPerMonth: 22, // 月の勤務日数上限
  mandatoryDaysOffPerMonth: 9, // 月の公休日数（必須）
  preferRestAfterMorningOff: true, // 夜勤明けの次の日は基本的に休み
  balanceNightShifts: true, // 夜勤の均等分散
  minRestDaysAfterNightSequence: 1, // 夜勤→明→休の最低休日数
};

// 新しいルール定義
export const ADVANCED_RULES = {
  // 夜勤後の休息パターン
  NIGHT_REST_PATTERN: {
    description: "夜勤 → 夜勤明け → 基本的に休み",
    mandatoryRestAfterMorningOff: true,
    flexibleWhenShortStaffed: true,
  },

  // 月間公休ルール
  MONTHLY_DAYS_OFF: {
    description: "月9日の公休が全員必須",
    requiredDaysOff: 9,
    includeVacations: true, // 有給等も含む
  },

  // 夜勤均等分散ルール
  NIGHT_SHIFT_BALANCE: {
    description: "夜勤は可能な限り全員均等に",
    balanceType: "EQUAL_DISTRIBUTION",
    considerEmployeeType: true, // 職種を考慮
  },

  // パートタイマールール
  PART_TIMER_RULES: {
    description: "パートタイマーの特別ルール",
    canWorkAsNurse: 1, // 1名は看護師として日勤可能
    mustWorkPM: 2, // 残り2名はどちらかが必ずPM勤務
    workTypes: ["DAY", "PM_ONLY"], // 可能な勤務タイプ
  },
};
