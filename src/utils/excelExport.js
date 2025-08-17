import * as XLSX from "xlsx";
import { SHIFT_TYPES, WEEKDAYS } from "../data/constants";

/**
 * スケジュールをExcelファイルに出力
 * @param {Object} schedule - 生成されたスケジュール
 * @param {Array} employees - 従業員リスト
 * @param {string} filename - ファイル名
 */
export function exportToExcel(schedule, employees, filename = "勤務表.xlsx") {
  // ワークブックの作成
  const workbook = XLSX.utils.book_new();

  // メインの勤務表シート
  const scheduleSheet = createScheduleSheet(schedule, employees);
  XLSX.utils.book_append_sheet(workbook, scheduleSheet, "勤務表");

  // 従業員リストシート
  const employeeSheet = createEmployeeSheet(employees);
  XLSX.utils.book_append_sheet(workbook, employeeSheet, "従業員リスト");

  // サマリーシート
  const summarySheet = createSummarySheet(schedule, employees);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "サマリー");

  // ファイルの保存
  XLSX.writeFile(workbook, filename);
}

/**
 * メインの勤務表シートを作成
 */
function createScheduleSheet(schedule, employees) {
  const dates = Object.keys(schedule).sort();
  const data = [];

  // ヘッダー行の作成
  const headerRow = ["従業員名", "職種", "雇用形態"];
  dates.forEach((date) => {
    const dateObj = new Date(date);
    const dayOfWeek = WEEKDAYS[dateObj.getDay()];
    headerRow.push(`${date.split("-")[2]}(${dayOfWeek})`);
  });
  // 横軸集計列を追加
  headerRow.push("公休", "日勤", "早番", "遅番", "夜勤", "夜勤明け");
  data.push(headerRow);

  // 各従業員の行を作成
  employees.forEach((employee) => {
    const row = [employee.name, employee.jobType, employee.employmentType];

    dates.forEach((date) => {
      const daySchedule = schedule[date];
      let assignment = "休";

      // その日の従業員の割り当てを検索
      Object.entries(daySchedule.shifts).forEach(([shiftType, shifts]) => {
        const foundShift = shifts.find(
          (shift) => shift.employee.id === employee.id
        );
        if (foundShift) {
          assignment = SHIFT_TYPES[shiftType]?.code || shiftType;
        }
      });

      row.push(assignment);
    });

    // 横軸集計を計算
    const employeeStats = getEmployeeStatsForExcel(
      employee.id,
      schedule,
      dates
    );
    row.push(
      employeeStats.公休,
      employeeStats.日勤,
      employeeStats.早番,
      employeeStats.遅番,
      employeeStats.夜勤,
      employeeStats.夜勤明け
    );

    data.push(row);
  });

  // 縦軸集計を追加
  const dailyStatsRows = createDailyStatsRows(schedule, dates);
  dailyStatsRows.forEach((row) => data.push(row));

  return XLSX.utils.aoa_to_sheet(data);
}

/**
 * Excel用の従業員統計計算
 */
function getEmployeeStatsForExcel(employeeId, schedule, dates) {
  const stats = {
    公休: 0,
    日勤: 0,
    早番: 0,
    遅番: 0,
    夜勤: 0,
    夜勤明け: 0,
  };

  dates.forEach((date) => {
    const daySchedule = schedule[date];
    let hasShift = false;

    Object.entries(daySchedule.shifts).forEach(([shiftType, shifts]) => {
      const hasThisShift = shifts.some(
        (shift) => shift.employee.id === employeeId
      );
      if (hasThisShift) {
        hasShift = true;
        switch (shiftType) {
          case "EARLY":
            stats.早番++;
            break;
          case "DAY":
            stats.日勤++;
            break;
          case "LATE":
            stats.遅番++;
            break;
          case "NIGHT":
            stats.夜勤++;
            break;
          case "MORNING_OFF":
            stats.夜勤明け++;
            break;
          case "OFF":
            stats.公休++;
            break;
        }
      }
    });

    if (!hasShift) {
      stats.公休++;
    }
  });

  return stats;
}

/**
 * 日別統計行を作成
 */
function createDailyStatsRows(schedule, dates) {
  const rows = [];

  // 早番人数行
  const earlyRow = ["早番人数", "-", "-"];
  dates.forEach((date) => {
    const daySchedule = schedule[date];
    earlyRow.push(daySchedule.shifts.EARLY?.length || 0);
  });
  // 横軸集計列は空白
  earlyRow.push("", "", "", "", "", "");
  rows.push(earlyRow);

  // 日勤人数行
  const dayRow = ["日勤人数", "-", "-"];
  dates.forEach((date) => {
    const daySchedule = schedule[date];
    dayRow.push(daySchedule.shifts.DAY?.length || 0);
  });
  dayRow.push("", "", "", "", "", "");
  rows.push(dayRow);

  // 遅番人数行
  const lateRow = ["遅番人数", "-", "-"];
  dates.forEach((date) => {
    const daySchedule = schedule[date];
    lateRow.push(daySchedule.shifts.LATE?.length || 0);
  });
  lateRow.push("", "", "", "", "", "");
  rows.push(lateRow);

  // 夜勤人数行
  const nightRow = ["夜勤人数", "-", "-"];
  dates.forEach((date) => {
    const daySchedule = schedule[date];
    nightRow.push(daySchedule.shifts.NIGHT?.length || 0);
  });
  nightRow.push("", "", "", "", "", "");
  rows.push(nightRow);

  return rows;
}

/**
 * 従業員リストシートを作成
 */
function createEmployeeSheet(employees) {
  const data = [["ID", "氏名", "職種", "雇用形態", "スキル"]];

  employees.forEach((employee) => {
    data.push([
      employee.id,
      employee.name,
      employee.jobType,
      employee.employmentType,
      employee.skills?.join(", ") || "",
    ]);
  });

  return XLSX.utils.aoa_to_sheet(data);
}

/**
 * サマリーシートを作成
 */
function createSummarySheet(schedule, employees) {
  const dates = Object.keys(schedule).sort();
  const data = [["日付", "早番", "日勤", "遅番", "夜勤", "合計勤務者数"]];

  dates.forEach((date) => {
    const daySchedule = schedule[date];
    const dateObj = new Date(date);
    const dayOfWeek = WEEKDAYS[dateObj.getDay()];

    const earlyCount = daySchedule.shifts.EARLY?.length || 0;
    const dayCount = daySchedule.shifts.DAY?.length || 0;
    const lateCount = daySchedule.shifts.LATE?.length || 0;
    const nightCount = daySchedule.shifts.NIGHT?.length || 0;
    const totalCount = earlyCount + dayCount + lateCount + nightCount;

    data.push([
      `${date}(${dayOfWeek})`,
      earlyCount,
      dayCount,
      lateCount,
      nightCount,
      totalCount,
    ]);
  });

  return XLSX.utils.aoa_to_sheet(data);
}

/**
 * CSVファイルとしてダウンロード
 */
export function exportToCSV(schedule, employees, filename = "勤務表.csv") {
  const dates = Object.keys(schedule).sort();
  let csvContent = "";

  // ヘッダー行
  const headerRow = ["従業員名", "職種", "雇用形態"];
  dates.forEach((date) => {
    const dateObj = new Date(date);
    const dayOfWeek = WEEKDAYS[dateObj.getDay()];
    headerRow.push(`${date.split("-")[2]}(${dayOfWeek})`);
  });
  csvContent += headerRow.join(",") + "\n";

  // データ行
  employees.forEach((employee) => {
    const row = [employee.name, employee.jobType, employee.employmentType];

    dates.forEach((date) => {
      const daySchedule = schedule[date];
      let assignment = "休";

      Object.entries(daySchedule.shifts).forEach(([shiftType, shifts]) => {
        const foundShift = shifts.find(
          (shift) => shift.employee.id === employee.id
        );
        if (foundShift) {
          assignment = SHIFT_TYPES[shiftType]?.code || shiftType;
        }
      });

      row.push(assignment);
    });

    csvContent += row.join(",") + "\n";
  });

  // ファイルダウンロード
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
