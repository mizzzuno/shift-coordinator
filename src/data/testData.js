// テスト用の従業員データ
export const TEST_EMPLOYEES = [
  // 看護師 (NS1~NS6)
  {
    id: "ns1",
    name: "NS1",
    jobType: "NURSE",
    employmentType: "FULL_TIME",
    skills: ["NURSE"],
  },
  {
    id: "ns2",
    name: "NS2",
    jobType: "NURSE",
    employmentType: "FULL_TIME",
    skills: ["NURSE"],
  },
  {
    id: "ns3",
    name: "NS3",
    jobType: "NURSE",
    employmentType: "FULL_TIME",
    skills: ["NURSE"],
  },
  {
    id: "ns4",
    name: "NS4",
    jobType: "NURSE",
    employmentType: "FULL_TIME",
    skills: ["NURSE"],
  },
  {
    id: "ns5",
    name: "NS5",
    jobType: "NURSE",
    employmentType: "FULL_TIME",
    skills: ["NURSE"],
  },
  {
    id: "ns6",
    name: "NS6",
    jobType: "NURSE",
    employmentType: "FULL_TIME",
    skills: ["NURSE"],
  },

  // 介護士 (CG11~CG15)
  {
    id: "cg11",
    name: "CG11",
    jobType: "CAREGIVER",
    employmentType: "FULL_TIME",
    skills: ["CAREGIVER"],
  },
  {
    id: "cg12",
    name: "CG12",
    jobType: "CAREGIVER",
    employmentType: "FULL_TIME",
    skills: ["CAREGIVER"],
  },
  {
    id: "cg13",
    name: "CG13",
    jobType: "CAREGIVER",
    employmentType: "FULL_TIME",
    skills: ["CAREGIVER"],
  },
  {
    id: "cg14",
    name: "CG14",
    jobType: "CAREGIVER",
    employmentType: "FULL_TIME",
    skills: ["CAREGIVER"],
  },
  {
    id: "cg15",
    name: "CG15",
    jobType: "CAREGIVER",
    employmentType: "FULL_TIME",
    skills: ["CAREGIVER"],
  },

  // パート (PT21~PT23)
  {
    id: "pt21",
    name: "PT21",
    jobType: "PART_TIME",
    employmentType: "PART_TIME",
    skills: ["PART_TIME", "CAREGIVER"], // 介護士スキルを明記
    canWorkAs: {
      CAREGIVER: ["DAY"], // 介護士として日勤のみ可能
    },
  },
  {
    id: "pt22",
    name: "PT22",
    jobType: "PART_TIME",
    employmentType: "PART_TIME",
    skills: ["PART_TIME"],
  },
  {
    id: "pt23",
    name: "PT23",
    jobType: "PART_TIME",
    employmentType: "PART_TIME",
    skills: ["PART_TIME"],
  },

  // 事務員（看護師資格あり） (AD31~AD32)
  {
    id: "ad31",
    name: "AD31",
    jobType: "ADMIN",
    employmentType: "FULL_TIME",
    skills: ["ADMIN", "NURSE"], // 看護師としても働ける
    canWorkAsNurse: true,
  },
  {
    id: "ad32",
    name: "AD32",
    jobType: "ADMIN",
    employmentType: "FULL_TIME",
    skills: ["ADMIN", "NURSE"], // 看護師としても働ける
    canWorkAsNurse: true,
  },
];

// テスト用の休暇希望データ
export const TEST_VACATION_REQUESTS = [
  // 看護師の休日希望
  {
    id: "vacation1",
    employeeId: "ns1",
    date: "2025-08-20",
    reason: "有給休暇",
    type: "PAID_LEAVE",
    priority: "HIGH",
  },
  {
    id: "vacation2",
    employeeId: "ns2",
    date: "2025-08-21",
    reason: "家族の用事",
    type: "PERSONAL_LEAVE",
    priority: "MEDIUM",
  },
  {
    id: "vacation3",
    employeeId: "ns3",
    date: "2025-08-25",
    reason: "有給休暇",
    type: "PAID_LEAVE",
    priority: "HIGH",
  },
  {
    id: "vacation4",
    employeeId: "ns4",
    date: "2025-08-28",
    reason: "体調管理",
    type: "SICK_LEAVE",
    priority: "HIGH",
  },
  {
    id: "vacation5",
    employeeId: "ns5",
    date: "2025-08-30",
    reason: "有給休暇",
    type: "PAID_LEAVE",
    priority: "MEDIUM",
  },

  // 介護士の休日希望
  {
    id: "vacation6",
    employeeId: "cg11",
    date: "2025-08-22",
    reason: "子供の行事",
    type: "FAMILY_LEAVE",
    priority: "HIGH",
  },
  {
    id: "vacation7",
    employeeId: "cg12",
    date: "2025-08-23",
    reason: "有給休暇",
    type: "PAID_LEAVE",
    priority: "MEDIUM",
  },
  {
    id: "vacation8",
    employeeId: "cg13",
    date: "2025-08-26",
    reason: "通院",
    type: "MEDICAL_LEAVE",
    priority: "HIGH",
  },
  {
    id: "vacation9",
    employeeId: "cg14",
    date: "2025-08-27",
    reason: "有給休暇",
    type: "PAID_LEAVE",
    priority: "LOW",
  },
  {
    id: "vacation10",
    employeeId: "cg15",
    date: "2025-08-29",
    reason: "冠婚葬祭",
    type: "SPECIAL_LEAVE",
    priority: "HIGH",
  },

  // パートタイマーの休日希望
  {
    id: "vacation11",
    employeeId: "pt21",
    date: "2025-08-24",
    reason: "家族旅行",
    type: "PERSONAL_LEAVE",
    priority: "MEDIUM",
  },
  {
    id: "vacation12",
    employeeId: "pt22",
    date: "2025-08-31",
    reason: "有給休暇",
    type: "PAID_LEAVE",
    priority: "LOW",
  },

  // 連続休暇の希望
  {
    id: "vacation13",
    employeeId: "ns6",
    date: "2025-08-19",
    reason: "夏季休暇（1日目）",
    type: "SUMMER_VACATION",
    priority: "MEDIUM",
    isConsecutive: true,
    consecutiveGroup: "summer_ns6",
  },
  {
    id: "vacation14",
    employeeId: "ns6",
    date: "2025-08-20",
    reason: "夏季休暇（2日目）",
    type: "SUMMER_VACATION",
    priority: "MEDIUM",
    isConsecutive: true,
    consecutiveGroup: "summer_ns6",
  },

  // 複数月にわたる休暇希望
  {
    id: "vacation15",
    employeeId: "pt23",
    date: "2025-09-01",
    reason: "有給休暇",
    type: "PAID_LEAVE",
    priority: "MEDIUM",
  },
  {
    id: "vacation16",
    employeeId: "cg11",
    date: "2025-09-05",
    reason: "研修参加",
    type: "TRAINING_LEAVE",
    priority: "HIGH",
  },

  // 週末をまたぐ連休希望
  {
    id: "vacation17",
    employeeId: "ns1",
    date: "2025-08-23", // 土曜日
    reason: "3連休希望（1日目）",
    type: "LONG_WEEKEND",
    priority: "LOW",
    isConsecutive: true,
    consecutiveGroup: "weekend_ns1",
  },
  {
    id: "vacation18",
    employeeId: "ns1",
    date: "2025-08-25", // 月曜日
    reason: "3連休希望（3日目）",
    type: "LONG_WEEKEND",
    priority: "LOW",
    isConsecutive: true,
    consecutiveGroup: "weekend_ns1",
  },

  // 緊急性の高い休暇希望
  {
    id: "vacation19",
    employeeId: "cg12",
    date: "2025-08-19",
    reason: "家族の急病",
    type: "EMERGENCY_LEAVE",
    priority: "URGENT",
    isEmergency: true,
  },
];

// 休日希望の種類定義
export const VACATION_TYPES = {
  PAID_LEAVE: { name: "有給休暇", color: "#e3f2fd" },
  SICK_LEAVE: { name: "病気休暇", color: "#ffebee" },
  FAMILY_LEAVE: { name: "家族休暇", color: "#f3e5f5" },
  PERSONAL_LEAVE: { name: "個人休暇", color: "#e8f5e8" },
  MEDICAL_LEAVE: { name: "通院休暇", color: "#fff3e0" },
  SPECIAL_LEAVE: { name: "特別休暇", color: "#fce4ec" },
  SUMMER_VACATION: { name: "夏季休暇", color: "#e1f5fe" },
  TRAINING_LEAVE: { name: "研修休暇", color: "#f9fbe7" },
  LONG_WEEKEND: { name: "連休希望", color: "#efebe9" },
  EMERGENCY_LEAVE: { name: "緊急休暇", color: "#ffcdd2" },
};

// 優先度定義
export const VACATION_PRIORITIES = {
  URGENT: { name: "緊急", level: 4, color: "#d32f2f" },
  HIGH: { name: "高", level: 3, color: "#f57c00" },
  MEDIUM: { name: "中", level: 2, color: "#388e3c" },
  LOW: { name: "低", level: 1, color: "#1976d2" },
};

// 月別休暇統計生成用のヘルパー関数
export function generateMonthlyVacationStats(vacationRequests) {
  const stats = {};

  vacationRequests.forEach((request) => {
    const date = new Date(request.date);
    const monthKey = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;

    if (!stats[monthKey]) {
      stats[monthKey] = {
        total: 0,
        byType: {},
        byPriority: {},
        byEmployee: {},
      };
    }

    stats[monthKey].total++;
    stats[monthKey].byType[request.type] =
      (stats[monthKey].byType[request.type] || 0) + 1;
    stats[monthKey].byPriority[request.priority] =
      (stats[monthKey].byPriority[request.priority] || 0) + 1;
    stats[monthKey].byEmployee[request.employeeId] =
      (stats[monthKey].byEmployee[request.employeeId] || 0) + 1;
  });

  return stats;
}

// 連続休暇のグループ化
export function groupConsecutiveVacations(vacationRequests) {
  const groups = {};

  vacationRequests
    .filter((request) => request.isConsecutive && request.consecutiveGroup)
    .forEach((request) => {
      if (!groups[request.consecutiveGroup]) {
        groups[request.consecutiveGroup] = [];
      }
      groups[request.consecutiveGroup].push(request);
    });

  // 各グループを日付順にソート
  Object.keys(groups).forEach((groupKey) => {
    groups[groupKey].sort((a, b) => new Date(a.date) - new Date(b.date));
  });

  return groups;
}
