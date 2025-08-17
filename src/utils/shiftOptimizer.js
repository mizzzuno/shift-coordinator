import {
  SHIFT_TYPES,
  JOB_TYPES,
  SHIFT_RULES,
  DEFAULT_CONSTRAINTS,
  ADVANCED_RULES,
} from "../data/constants";

/**
 * シフト最適化クラス
 */
export class ShiftOptimizer {
  constructor(employees = [], constraints = {}, vacationRequests = []) {
    this.employees = employees || [];
    this.constraints = {
      ...DEFAULT_CONSTRAINTS,
      ...(constraints || {}),
      shifts: SHIFT_RULES,
    };
    this.vacationRequests = vacationRequests || [];
    this.schedule = {};
    this.nightShiftHistory = {};
    this.staffingAlerts = [];

    this.initializeNightShiftHistory();
  }

  /**
   * スケジュール最適化のメイン処理
   */
  optimize(startDate, days) {
    this.schedule = {};
    this.staffingAlerts = [];

    // スケジュールの初期化
    this.initializeSchedule(startDate, days);

    // 各日のシフト割り当て
    for (let day = 0; day < days; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);

      this.assignDailyShifts(currentDate);
    }

    // 夜勤→明け→休みのルールを適用
    this.applyNightShiftFollowUpRules(startDate, days);

    // 最優先：公休9日の確保（最重要）
    this.ensureMandatoryDaysOffPriority(startDate, days);

    // 後処理：勤務バランスの調整
    this.balanceWorkloadAndVacations(startDate, days);

    // 最終チェック：必須人員の確保
    this.ensureMandatoryStaffing(startDate, days);

    // 連続勤務最終調整（6日以上を防止）
    this.enforceMaxConsecutiveWorkDays(startDate, days);

    return {
      schedule: this.schedule,
      alerts: this.staffingAlerts,
    };
  }

  /**
   * 夜勤履歴の初期化
   */
  initializeNightShiftHistory() {
    if (!this.employees || this.employees.length === 0) {
      console.warn("従業員データが空です");
      return;
    }

    const nightShiftEligibleEmployees = this.employees.filter(
      (emp) =>
        emp && emp.jobType === "正社員" && emp.canWorkNightShift !== false
    );

    // 各従業員の夜勤回数をできる限り均等にする
    const baseShifts = 4; // 月の基本夜勤回数
    const totalEmployees = nightShiftEligibleEmployees.length;

    nightShiftEligibleEmployees.forEach((emp, index) => {
      if (emp && emp.id) {
        this.nightShiftHistory[emp.id] = {
          totalNightShifts: baseShifts + (index % 2), // 偶数/奇数で1回差
          lastNightShift: null,
          consecutiveWorkDays: 0,
          nightShiftBalance: baseShifts, // バランス調整用
        };
      }
    });

    // パートタイマーは夜勤対象外
    this.employees
      .filter((emp) => emp && emp.jobType !== "正社員")
      .forEach((emp) => {
        if (emp && emp.id) {
          this.nightShiftHistory[emp.id] = {
            totalNightShifts: 0,
            lastNightShift: null,
            consecutiveWorkDays: 0,
            nightShiftBalance: 0,
          };
        }
      });
  }

  /**
   * スケジュールの初期化
   */
  initializeSchedule(startDate, days) {
    if (!startDate || !(startDate instanceof Date)) {
      throw new Error("開始日が無効です");
    }

    if (!days || days <= 0) {
      throw new Error("日数が無効です");
    }

    for (let day = 0; day < days; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);
      const dateKey = this.formatDate(currentDate);

      this.schedule[dateKey] = {
        date: currentDate,
        shifts: {
          EARLY: [],
          DAY: [],
          LATE: [],
          NIGHT: [],
          AM_ONLY: [],
          PM_ONLY: [],
          OFF: [],
          MORNING_OFF: [],
        },
      };

      // 休暇リクエストの処理
      this.processVacationRequests(currentDate);
    }
  }

  /**
   * 休暇リクエストの処理
   */
  processVacationRequests(date) {
    if (!this.vacationRequests || !Array.isArray(this.vacationRequests)) {
      return;
    }

    const dateKey = this.formatDate(date);

    this.vacationRequests.forEach((request) => {
      if (!request || !request.date || !request.employeeId) {
        return;
      }

      try {
        const requestDate = new Date(request.date);
        if (requestDate.toDateString() === date.toDateString()) {
          const employee = this.employees.find(
            (emp) => emp && emp.id === request.employeeId
          );
          if (employee) {
            this.schedule[dateKey].shifts.OFF.push({
              employee: employee,
              reason: request.reason || "有給休暇",
              isVacationRequest: true,
            });
          }
        }
      } catch (error) {
        console.warn("休暇リクエスト処理エラー:", request, error);
      }
    });
  }

  /**
   * 1日のシフト割り当て
   */
  assignDailyShifts(date) {
    const dateKey = this.formatDate(date);
    const shiftRules = this.constraints.shifts;

    if (!shiftRules || typeof shiftRules !== "object") {
      console.warn("シフトルールが無効です:", shiftRules);
      return;
    }

    // 各シフトタイプに対してスタッフを割り当て
    Object.entries(shiftRules).forEach(([shiftType, rule]) => {
      if (rule && typeof rule === "object") {
        this.assignShiftStaff(date, shiftType, rule);
      }
    });

    // パートタイマーのPMルール適用
    this.enforcePartTimerPMRule(date);

    // PT21を必要に応じて日勤補助配置
    this.addSupplementalDayShiftPartTimer(date);

    // 日勤不足時 事務員で穴埋め
    this.backfillDayShiftWithAdmins(date);

    // 連続勤務日数の更新
    this.updateConsecutiveWorkDays(date);

    // 必須シフトの人員チェック
    this.checkMandatoryStaffing(date);
  }

  /**
   * 日勤の人数が最小人数に達していない場合、事務員(ADMIN)で穴埋めする
   * 看護師資格がなくても人数確保目的で配置（スキル要件より人数の確保を優先）
   */
  backfillDayShiftWithAdmins(date) {
    const dateKey = this.formatDate(date);
    const rule = this.constraints?.shifts?.DAY;
    if (!rule || !this.schedule[dateKey]) return;

    const dayAssignments = this.schedule[dateKey].shifts.DAY || [];
    const currentCount = dayAssignments.length;
    const needed = (rule.minStaff || 0) - currentCount;
    if (needed <= 0) return; // 足りている

    // 既に何らかのシフトに入っている者は除外し、空いている事務員を取得
    const availableAdmins = this.employees.filter(
      (emp) =>
        emp.jobType === "ADMIN" &&
        !this.isEmployeeAlreadyAssigned(emp.id, dateKey)
    );

    if (availableAdmins.length === 0) return; // 補充要員なし

    let added = 0;
    for (const admin of availableAdmins) {
      if (added >= needed) break;
      this.schedule[dateKey].shifts.DAY.push({
        employee: admin,
        reason: "日勤不足穴埋め(事務員)",
        isBackfill: true,
      });
      added++;
      this.staffingAlerts.push({
        type: "DAY_BACKFILL_ADMIN",
        severity: "info",
        date: dateKey,
        employee: admin.name,
        message: `日勤最小人数不足のため事務員${admin.name}さんを穴埋め配置 (${
          currentCount + added
        }/${rule.minStaff})`,
      });
    }
  }

  /**
   * 連続勤務日数の更新
   */
  updateConsecutiveWorkDays(date) {
    const dateKey = this.formatDate(date);

    this.employees.forEach((employee) => {
      if (!this.nightShiftHistory[employee.id]) {
        this.nightShiftHistory[employee.id] = {
          totalNightShifts: 0,
          lastNightShift: null,
          consecutiveWorkDays: 0,
          nightShiftBalance: 0,
        };
      }

      if (this.isEmployeeWorking(employee.id, dateKey)) {
        this.nightShiftHistory[employee.id].consecutiveWorkDays++;
      } else {
        this.nightShiftHistory[employee.id].consecutiveWorkDays = 0;
      }
    });
  }

  /**
   * 夜勤→明け→休みのルールを適用
   */
  applyNightShiftFollowUpRules(startDate, days) {
    for (let day = 0; day < days; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);
      const dateKey = this.formatDate(currentDate);

      // 当日夜勤の従業員を取得
      if (this.schedule[dateKey] && this.schedule[dateKey].shifts.NIGHT) {
        const nightShiftEmployees = this.schedule[dateKey].shifts.NIGHT.map(
          (shift) => shift.employee
        );

        nightShiftEmployees.forEach((employee) => {
          // 翌日に明けを設定
          this.setMorningOffForEmployee(employee, currentDate, days);

          // 明けの翌日に休みを設定
          this.setRestAfterMorningOff(employee, currentDate, days);
        });
      }
    }
  }

  /**
   * 夜勤の翌日に明けを設定
   */
  setMorningOffForEmployee(employee, nightDate, totalDays) {
    const nextDate = new Date(nightDate);
    nextDate.setDate(nightDate.getDate() + 1);

    // 範囲外チェック
    if (this.isDateOutOfRange(nextDate, nightDate, totalDays)) {
      return;
    }

    const nextDateKey = this.formatDate(nextDate);

    if (this.schedule[nextDateKey]) {
      const alreadyMorningOff = this.schedule[
        nextDateKey
      ].shifts.MORNING_OFF.some((s) => s.employee.id === employee.id);

      if (alreadyMorningOff) {
        // 既に明けになっているので何もしない
        return;
      }

      // 既存の全シフト割当（休み/他シフト含む）を強制除去し必ず明けにする
      const beforeAssigned = this.isEmployeeAlreadyAssigned(
        employee.id,
        nextDateKey
      );
      if (beforeAssigned) {
        this.removeEmployeeFromShifts(employee.id, nextDateKey);
        // OFFシフトにも入っている可能性があるので除去
        this.schedule[nextDateKey].shifts.OFF = this.schedule[
          nextDateKey
        ].shifts.OFF.filter((s) => s.employee.id !== employee.id);
      }

      this.schedule[nextDateKey].shifts.MORNING_OFF.push({
        employee: employee,
        reason: "夜勤明け（強制適用）",
        isAutoAssigned: true,
        isForced: beforeAssigned,
      });

      if (beforeAssigned) {
        this.staffingAlerts.push({
          type: "FORCED_MORNING_OFF",
          severity: "warning",
          date: this.formatDate(nextDate),
          employee: employee.name,
          message: `${employee.name}さんの夜勤翌日(${this.formatDate(
            nextDate
          )})に他シフト/休みが存在したため強制的に明けへ置換しました`,
        });
      } else {
        console.log(
          `${employee.name}さんの明けを設定: ${this.formatDate(nextDate)}`
        );
      }
    }
  }

  /**
   * 明けの翌日に休みを設定
   */
  setRestAfterMorningOff(employee, nightDate, totalDays) {
    const restDate = new Date(nightDate);
    restDate.setDate(nightDate.getDate() + 2); // 夜勤の2日後

    // 範囲外チェック
    if (this.isDateOutOfRange(restDate, nightDate, totalDays)) {
      return;
    }

    const restDateKey = this.formatDate(restDate);

    if (this.schedule[restDateKey]) {
      // 既にOFFなら何もしない
      const alreadyOff = this.schedule[restDateKey].shifts.OFF.some(
        (s) => s.employee.id === employee.id
      );
      if (alreadyOff) return;

      // 他シフトに入っている場合も強制的にOFFへ置換
      const wasAssigned = this.isEmployeeAlreadyAssigned(
        employee.id,
        restDateKey
      );
      if (wasAssigned) {
        this.removeEmployeeFromShifts(employee.id, restDateKey);
        this.schedule[restDateKey].shifts.MORNING_OFF = this.schedule[
          restDateKey
        ].shifts.MORNING_OFF.filter((s) => s.employee.id !== employee.id);
      }

      this.schedule[restDateKey].shifts.OFF.push({
        employee: employee,
        reason: "夜勤明け翌日休み（強制適用）",
        isAutoAssigned: true,
        isForced: wasAssigned,
      });

      if (wasAssigned) {
        this.staffingAlerts.push({
          type: "FORCED_REST_AFTER_MORNING_OFF",
          severity: "warning",
          date: this.formatDate(restDate),
          employee: employee.name,
          message: `${employee.name}さんの夜勤明け翌日(${this.formatDate(
            restDate
          )})に他シフトが存在したため強制的に休みに置換しました`,
        });
      } else {
        console.log(
          `${employee.name}さんの夜勤明け後休みを設定: ${this.formatDate(
            restDate
          )}`
        );
      }
    }
  }

  /**
   * 日付が範囲外かチェック
   */
  isDateOutOfRange(targetDate, startDate, totalDays) {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + totalDays - 1);
    return targetDate > endDate;
  }

  /**
   * 従業員を休みにできるかチェック
   */
  canSetEmployeeToRest(employee, date) {
    // 簡略化した実装 - 最低人員の確保をチェック
    // 実際にはより詳細な人員配置チェックが必要
    return true;
  }

  /**
   * 特定シフトのスタッフ割り当て
   */
  assignShiftStaff(date, shiftType, rule) {
    const dateKey = this.formatDate(date);
    const availableEmployees = this.getAvailableEmployees(date, shiftType);

    if (availableEmployees.length === 0) {
      this.staffingAlerts.push({
        type: "NO_AVAILABLE_STAFF",
        severity: "error",
        date: this.formatDate(date),
        shift: shiftType,
        message: `${shiftType}シフトに利用可能なスタッフがいません`,
      });
      return;
    }

    const assignments = this.selectOptimalEmployees(
      availableEmployees,
      rule,
      shiftType
    );
    this.schedule[dateKey].shifts[shiftType].push(...assignments);
  }

  /**
   * 利用可能な従業員の取得
   */
  getAvailableEmployees(date, shiftType) {
    const dateKey = this.formatDate(date);

    return this.employees.filter((employee) => {
      // 既に休暇や他のシフトに割り当てられていないかチェック
      if (this.isEmployeeAlreadyAssigned(employee.id, dateKey)) {
        return false;
      }

      // PT21は日勤のみ、PMは不可
      if (employee.id === "pt21" && shiftType !== "DAY") {
        return false; // 日勤以外は不可（早番/遅番/夜勤/PM/AMなど全て除外）
      }

      // シフト固有の制約チェック
      if (!this.checkShiftConstraints(employee, date, shiftType)) {
        return false;
      }

      // パートタイマーと事務員の夜勤制限
      if (
        shiftType === "NIGHT" &&
        (employee.jobType === "PART_TIME" || employee.jobType === "ADMIN")
      ) {
        return false;
      }

      return true;
    });
  }

  /**
   * 従業員が既に割り当てられているかチェック
   */
  isEmployeeAlreadyAssigned(employeeId, dateKey) {
    const daySchedule = this.schedule[dateKey];

    return Object.values(daySchedule.shifts).some((shifts) =>
      shifts.some((shift) => shift.employee.id === employeeId)
    );
  }

  /**
   * 従業員が特定のシフトに割り当てられているかチェック
   */
  isEmployeeAssignedToShift(employeeId, dateKey, shiftType) {
    const daySchedule = this.schedule[dateKey];

    if (!daySchedule || !daySchedule.shifts[shiftType]) {
      return false;
    }

    return daySchedule.shifts[shiftType].some(
      (shift) => shift.employee && shift.employee.id === employeeId
    );
  }

  /**
   * 指定日の総勤務者数を取得
   */
  getTotalStaffCount(dateKey) {
    const daySchedule = this.schedule[dateKey];

    if (!daySchedule) {
      return 0;
    }

    let totalCount = 0;
    Object.keys(daySchedule.shifts).forEach((shiftType) => {
      if (shiftType !== "OFF") {
        // 休み以外のシフト
        totalCount += daySchedule.shifts[shiftType].length;
      }
    });

    return totalCount;
  }

  /**
   * シフト制約のチェック
   */
  checkShiftConstraints(employee, date, shiftType) {
    // 夜勤明け翌日休みルール
    if (!this.checkRestAfterNightShiftRule(employee, date, shiftType)) {
      return false;
    }

    // 夜勤明け後の基本休日ルール
    if (!this.checkRestAfterMorningOffRule(employee, date, shiftType)) {
      return false;
    }

    // 連続勤務日数チェック
    if (!this.checkConsecutiveWorkDays(employee)) {
      return false;
    }

    // 月間公休日数チェック
    if (!this.checkMonthlyDaysOff(employee, date)) {
      return false;
    }

    return true;
  }

  /**
   * 連続勤務日数ルールチェック
   */
  checkConsecutiveWorkDays(employee) {
    const consecutiveWorkDays =
      this.nightShiftHistory[employee.id]?.consecutiveWorkDays || 0;
    const maxConsecutiveWorkDays = this.constraints.maxConsecutiveWorkDays || 5;

    if (consecutiveWorkDays >= maxConsecutiveWorkDays) {
      console.log(
        `${employee.name}さんは連続勤務日数が上限に達したため、本日は勤務できません (${consecutiveWorkDays}日)`
      );
      return false;
    }
    return true;
  }

  /**
   * 夜勤明け翌日休みルールチェック
   */
  checkRestAfterNightShiftRule(employee, date, shiftType) {
    // 前日が夜勤だったかチェック
    const previousDate = new Date(date);
    previousDate.setDate(date.getDate() - 1);
    const previousDateKey = this.formatDate(previousDate);

    if (this.schedule[previousDateKey]) {
      const hadNightShift = this.schedule[previousDateKey].shifts.NIGHT.some(
        (shift) => shift.employee.id === employee.id
      );

      if (hadNightShift && shiftType !== "MORNING_OFF") {
        return false; // 例外なく拒否
      }
    }

    return true;
  }

  /**
   * 夜勤明け後の基本休日ルールチェック
   */
  checkRestAfterMorningOffRule(employee, date, shiftType) {
    // 前日が夜勤明けかチェック
    const previousDate = new Date(date);
    previousDate.setDate(date.getDate() - 1);
    const previousDateKey = this.formatDate(previousDate);

    if (this.schedule[previousDateKey]) {
      const wasMorningOff = this.schedule[
        previousDateKey
      ].shifts.MORNING_OFF.some((shift) => shift.employee.id === employee.id);

      if (wasMorningOff && shiftType !== "OFF") {
        return false; // 例外なく拒否
      }
    }

    return true;
  }

  /**
   * 月間公休日数チェック
   */
  checkMonthlyDaysOff(employee, date) {
    const requiredDaysOff = this.constraints.mandatoryDaysOffPerMonth || 9;
    // 簡略化 - 実際には月単位で計算する必要がある
    return true;
  }

  /**
   * スタッフ不足が深刻かチェック
   */
  isStaffingCritical(date, shiftType) {
    const dateKey = this.formatDate(date);

    if (!this.schedule[dateKey] || !this.constraints.shifts) {
      return false;
    }

    // 該当シフトの必要人数を取得
    const shiftRule = this.constraints.shifts[shiftType];
    if (!shiftRule || !shiftRule.mandatory) {
      return false; // 必須でないシフトの場合
    }

    // 現在割り当てられている人数
    const currentStaff = this.schedule[dateKey].shifts[shiftType]?.length || 0;
    const requiredStaff = shiftRule.minStaff || 1;

    // 最低人員を下回る場合のみ人手不足と判定
    const isCritical = currentStaff < requiredStaff;

    if (isCritical) {
      console.log(
        `人手不足検出: ${this.formatDate(
          date
        )} ${shiftType}シフト (必要${requiredStaff}名/現在${currentStaff}名)`
      );
    }

    return isCritical;
  }

  /**
   * 従業員がその日働いているかチェック
   */
  isEmployeeWorking(employeeId, dateKey) {
    if (!this.schedule[dateKey]) return false;

    const workShifts = ["EARLY", "DAY", "LATE", "NIGHT", "AM_ONLY", "PM_ONLY"];

    return workShifts.some((shiftType) =>
      this.schedule[dateKey].shifts[shiftType]?.some(
        (shift) => shift.employee.id === employeeId
      )
    );
  }

  /**
   * 最適な従業員の選択
   */
  selectOptimalEmployees(availableEmployees, rule, shiftType = null) {
    const assignments = [];

    if (rule.requiredSkills.includes("NURSE_OR_CAREGIVER")) {
      // 看護師または介護士のどちらか1名
      const qualified = availableEmployees.filter(
        (emp) => emp.jobType === "NURSE" || emp.jobType === "CAREGIVER"
      );

      if (qualified.length > 0) {
        const selected = this.selectEmployeeWithBalance(qualified, shiftType);
        assignments.push({ employee: selected });
      }
    } else {
      // 特定のスキルが必要
      rule.requiredSkills.forEach((skill) => {
        let qualified = availableEmployees.filter(
          (emp) => emp.jobType === skill
        );

        // 看護師が必要な場合の代替ロジック
        if (skill === "NURSE" && qualified.length === 0) {
          // 1. 事務員（看護師資格あり）を確認
          const adminNurses = availableEmployees.filter(
            (emp) => emp.jobType === "ADMIN" && emp.canWorkAsNurse
          );

          if (adminNurses.length > 0) {
            qualified = [adminNurses[0]];
            this.staffingAlerts.push({
              type: "ADMIN_AS_NURSE",
              severity: "warning",
              message: `看護師不足のため、${adminNurses[0].name}（事務員）を看護師として配置`,
              date: this.formatDate(new Date()),
              shift: shiftType,
            });
          }
          // 2. 日勤の場合、パートタイマーが看護師として勤務可能
          else if (shiftType === "DAY" && rule.allowPartAsNurse) {
            const availableParts = availableEmployees.filter(
              (emp) => emp.jobType === "PART_TIME"
            );
            if (availableParts.length > 0) {
              qualified = [availableParts[0]];
            }
          }
        }

        // 介護士が必要な場合の代替ロジック（看護師→介護士代替可能）
        if (skill === "CAREGIVER" && qualified.length === 0) {
          const availableNurses = availableEmployees.filter(
            (emp) => emp.jobType === "NURSE"
          );

          if (availableNurses.length > 0) {
            qualified = [availableNurses[0]];
            this.staffingAlerts.push({
              type: "NURSE_AS_CAREGIVER",
              severity: "info",
              message: `${availableNurses[0].name}（看護師）を介護士として配置`,
              date: this.formatDate(new Date()),
              shift: shiftType,
            });
          }
        }

        // 日勤の場合、PT21が介護士代替可能
        if (
          (skill === "CAREGIVER" || skill === "NURSE") &&
          qualified.length === 0 &&
          shiftType === "DAY"
        ) {
          const pt21 = availableEmployees.find((emp) => emp.id === "pt21");

          if (pt21) {
            qualified = [pt21];
            this.staffingAlerts.push({
              type: "PART_TIME_SUBSTITUTION",
              severity: "info",
              message: `PT21さんを日勤（${
                skill === "NURSE" ? "看護師" : "介護士"
              }代替）として配置`,
              date: this.formatDate(new Date()),
              shift: shiftType,
            });
          }
        }

        if (qualified.length > 0) {
          const selected = this.selectEmployeeWithBalance(qualified, shiftType);
          assignments.push({ employee: selected });
        }
      });
    }

    return assignments;
  }

  /**
   * バランスを考慮した従業員選択
   */
  selectEmployeeWithBalance(candidates, shiftType) {
    if (shiftType === "NIGHT" && this.constraints.balanceNightShifts) {
      // 夜勤の場合は均等分散を考慮
      return this.selectEmployeeForNightShift(candidates);
    }

    // 通常のシフトでは勤務バランスを考慮
    return this.selectEmployeeByWorkBalance(candidates);
  }

  /**
   * 夜勤用の従業員選択（均等分散）
   */
  selectEmployeeForNightShift(candidates) {
    // 夜勤回数が最も少ない従業員を選択
    let minNightShifts = Infinity;
    let selectedEmployee = candidates[0];

    candidates.forEach((employee) => {
      const nightShiftCount =
        this.nightShiftHistory[employee.id]?.totalNightShifts || 0;
      const balance =
        this.nightShiftHistory[employee.id]?.nightShiftBalance || 0;

      // バランス値が低い（夜勤が少ない）従業員を優先
      if (balance < minNightShifts) {
        minNightShifts = balance;
        selectedEmployee = employee;
      }
    });

    // 選択された従業員の夜勤回数を更新
    if (this.nightShiftHistory[selectedEmployee.id]) {
      this.nightShiftHistory[selectedEmployee.id].totalNightShifts++;
      this.nightShiftHistory[selectedEmployee.id].nightShiftBalance++;
    }

    return selectedEmployee;
  }

  /**
   * 勤務バランスを考慮した従業員選択
   */
  selectEmployeeByWorkBalance(candidates) {
    if (candidates.length === 1) return candidates[0];

    // 勤務日数が少ない従業員を優先
    let minWorkDays = Infinity;
    let selectedEmployee = candidates[0];

    candidates.forEach((employee) => {
      const workDays = this.countEmployeeWorkDays(employee.id);
      if (workDays < minWorkDays) {
        minWorkDays = workDays;
        selectedEmployee = employee;
      }
    });

    return selectedEmployee;
  }

  /**
   * 従業員の勤務日数をカウント
   */
  countEmployeeWorkDays(employeeId) {
    let workDays = 0;

    Object.keys(this.schedule).forEach((dateKey) => {
      if (this.isEmployeeWorking(employeeId, dateKey)) {
        workDays++;
      }
    });

    return workDays;
  }

  /**
   * 公休9日確保を最優先で実行
   */
  ensureMandatoryDaysOffPriority(startDate, days) {
    console.log("🔥 公休9日確保を最優先で開始");

    this.employees.forEach((employee) => {
      const requiredDaysOff = 9; // 最重要条件：月9日の公休
      const currentDaysOff = this.countEmployeeDaysOff(
        employee.id,
        startDate,
        days
      );
      const shortage = requiredDaysOff - currentDaysOff;

      if (shortage > 0) {
        console.log(`${employee.name}: 公休不足${shortage}日 - 積極的確保開始`);

        // より積極的な公休確保
        const added = this.forceAdditionalDaysOff(
          employee,
          shortage,
          startDate,
          days
        );

        if (added < shortage) {
          // まだ不足する場合、PT21や事務員を活用
          const remainingShortage = shortage - added;
          const extraAdded = this.substituteWithPartTimeAndAdmin(
            employee,
            remainingShortage,
            startDate,
            days
          );

          if (added + extraAdded < shortage) {
            this.staffingAlerts.push({
              type: "MANDATORY_DAYS_OFF_SHORTAGE",
              severity: "error",
              message: `${
                employee.name
              }さんの公休が不足しています。必要: ${requiredDaysOff}日、確保済み: ${
                currentDaysOff + added + extraAdded
              }日`,
              employee: employee.name,
              required: requiredDaysOff,
              current: currentDaysOff + added + extraAdded,
              shortage: shortage - added - extraAdded,
            });
          }
        }
      } else {
        console.log(`${employee.name}: 公休${currentDaysOff}日 - OK`);
      }
    });
  }

  /**
   * 勤務バランスと休暇の調整
   */
  balanceWorkloadAndVacations(startDate, days) {
    // 1. 月間公休日数の調整
    this.adjustMonthlyDaysOff(startDate, days);

    // 2. 夜勤の均等化の最終調整
    this.rebalanceNightShifts(startDate, days);

    // 3. 勤務日数の均等化
    this.equalizeWorkDays(startDate, days);
  }

  /**
   * 夜勤の再バランス
   */
  rebalanceNightShifts(startDate, days) {
    const nightShiftEligibleEmployees = this.employees.filter(
      (emp) => emp.jobType === "正社員" && emp.canWorkNightShift !== false
    );

    if (nightShiftEligibleEmployees.length === 0) return;

    // 現在の夜勤分布を計算
    const nightShiftCounts = {};
    nightShiftEligibleEmployees.forEach((emp) => {
      nightShiftCounts[emp.id] = this.countEmployeeNightShifts(
        emp.id,
        startDate,
        days
      );
    });

    // 平均夜勤回数を計算
    const totalNightShifts = Object.values(nightShiftCounts).reduce(
      (a, b) => a + b,
      0
    );
    const averageNightShifts =
      totalNightShifts / nightShiftEligibleEmployees.length;

    // 夜勤が少ない従業員を特定
    const underworkedEmployees = nightShiftEligibleEmployees.filter(
      (emp) => nightShiftCounts[emp.id] < Math.floor(averageNightShifts)
    );

    // 夜勤が多い従業員を特定
    const overworkedEmployees = nightShiftEligibleEmployees.filter(
      (emp) => nightShiftCounts[emp.id] > Math.ceil(averageNightShifts)
    );

    // 可能な範囲で夜勤を再配分
    this.redistributeNightShifts(
      underworkedEmployees,
      overworkedEmployees,
      startDate,
      days
    );
  }

  /**
   * 従業員の夜勤回数をカウント
   */
  countEmployeeNightShifts(employeeId, startDate, days) {
    let nightShifts = 0;

    for (let day = 0; day < days; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);
      const dateKey = this.formatDate(currentDate);

      if (this.schedule[dateKey]) {
        const hasNightShift = this.schedule[dateKey].shifts.NIGHT.some(
          (shift) => shift.employee.id === employeeId
        );
        if (hasNightShift) nightShifts++;
      }
    }

    return nightShifts;
  }

  /**
   * 夜勤の再配分
   */
  redistributeNightShifts(underworked, overworked, startDate, days) {
    // 複雑なロジックのため、将来的に詳細実装
    // 現在は基本的なバランス調整のみ

    if (underworked.length === 0 || overworked.length === 0) return;

    console.log("夜勤バランス調整:", {
      underworked: underworked.map((emp) => emp.name),
      overworked: overworked.map((emp) => emp.name),
    });
  }

  /**
   * 勤務日数の均等化
   */
  equalizeWorkDays(startDate, days) {
    const allEmployees = this.employees;
    const workDayCounts = {};

    // 各従業員の勤務日数を計算
    allEmployees.forEach((emp) => {
      workDayCounts[emp.id] = this.countEmployeeWorkDays(emp.id);
    });

    // 職種別の平均勤務日数を計算
    const jobTypeAverages = {};
    const jobTypeCounts = {};

    allEmployees.forEach((emp) => {
      if (!jobTypeAverages[emp.jobType]) {
        jobTypeAverages[emp.jobType] = 0;
        jobTypeCounts[emp.jobType] = 0;
      }
      jobTypeAverages[emp.jobType] += workDayCounts[emp.id];
      jobTypeCounts[emp.jobType]++;
    });

    Object.keys(jobTypeAverages).forEach((jobType) => {
      jobTypeAverages[jobType] =
        jobTypeAverages[jobType] / jobTypeCounts[jobType];
    });

    console.log("勤務日数バランス:", jobTypeAverages);
  }

  /**
   * 従業員の休日数をカウント
   */
  countEmployeeDaysOff(employeeId, startDate, days) {
    let daysOff = 0;

    for (let day = 0; day < days; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);
      const dateKey = this.formatDate(currentDate);

      if (this.schedule[dateKey]) {
        const isOff = this.schedule[dateKey].shifts.OFF.some(
          (shift) => shift.employee.id === employeeId
        );
        const isMorningOff = this.schedule[dateKey].shifts.MORNING_OFF.some(
          (shift) => shift.employee.id === employeeId
        );

        if (isOff || isMorningOff) {
          daysOff++;
        } else if (!this.isEmployeeWorking(employeeId, dateKey)) {
          daysOff++; // どのシフトにも割り当てられていない = 休み
        }
      }
    }

    return daysOff;
  }

  /**
   * 月間公休日数の調整
   */
  /**
   * 月間公休日数の調整（必須9日確保）
   */
  /**
   * 月間公休日数の調整（必須9日確保）
   */
  adjustMonthlyDaysOff(startDate, days) {
    const requiredDaysOff = 9; // 必須公休日数

    this.employees.forEach((employee) => {
      const currentDaysOff = this.countEmployeeDaysOff(
        employee.id,
        startDate,
        days
      );
      const shortage = requiredDaysOff - currentDaysOff;

      if (shortage > 0) {
        const added = this.addAdditionalDaysOff(
          employee,
          shortage,
          startDate,
          days
        );

        if (added < shortage) {
          // 公休9日を確保できない場合の警告のみ表示
          this.staffingAlerts.push({
            type: "MANDATORY_DAYS_OFF_SHORTAGE",
            severity: "error",
            message: `${
              employee.name
            }さんの公休が不足しています。必要: ${requiredDaysOff}日、確保済み: ${
              currentDaysOff + added
            }日`,
            employee: employee.name,
            required: requiredDaysOff,
            current: currentDaysOff + added,
            shortage: shortage - added,
          });
        }
        // 成功メッセージは削除（アラート不要）
      }
    });
  }

  /**
   * 追加の休日を設定（公休9日必須確保）
   */
  addAdditionalDaysOff(employee, additionalDays, startDate, totalDays) {
    let added = 0;
    const availableDates = [];

    // まず、休みにできる候補日を収集
    for (let day = 0; day < totalDays; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);
      const dateKey = this.formatDate(currentDate);

      if (
        this.schedule[dateKey] &&
        !this.isEmployeeWorking(employee.id, dateKey)
      ) {
        // 既に休みの日はスキップ
        continue;
      }

      // バケーション申請がある日は優先的に休みにする
      const hasVacationRequest = this.vacationRequests.some(
        (req) =>
          req.employeeId === employee.id &&
          req.date === dateKey.split("-").join("-")
      );

      if (hasVacationRequest) {
        availableDates.unshift({
          date: currentDate,
          dateKey,
          priority: "high",
        });
      } else {
        // 公休確保のため、より積極的に候補日を追加
        const canForceOff = this.canForceEmployeeOff(employee, currentDate);
        if (canForceOff.canOff) {
          availableDates.push({
            date: currentDate,
            dateKey,
            priority: "normal",
            forced: canForceOff.forced,
          });
        }
      }
    }

    // 優先度順に休みを設定
    for (const dateInfo of availableDates) {
      if (added >= additionalDays) break;

      this.removeEmployeeFromShifts(employee.id, dateInfo.dateKey);
      this.schedule[dateInfo.dateKey].shifts.OFF.push({
        employee,
        reason: dateInfo.priority === "high" ? "休暇申請" : "公休（必須確保）",
      });
      added++;

      // 強制的に休みにした場合の警告
      if (dateInfo.forced) {
        this.staffingAlerts.push({
          type: "FORCED_DAY_OFF",
          severity: "warning",
          message: `${employee.name}さんの公休確保のため、${this.formatDate(
            dateInfo.date
          )}を強制的に休みに設定しました`,
          employee: employee.name,
          date: this.formatDate(dateInfo.date),
        });
      }
    }

    return added;
  }

  /**
   * より積極的な公休確保（最優先）
   */
  forceAdditionalDaysOff(employee, additionalDays, startDate, totalDays) {
    let added = 0;
    const availableDates = [];

    // 休みにできる候補日を積極的に収集
    for (let day = 0; day < totalDays; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);
      const dateKey = this.formatDate(currentDate);

      if (!this.schedule[dateKey]) continue;

      // 既に休みの日はスキップ
      if (!this.isEmployeeWorking(employee.id, dateKey)) continue;

      // 夜勤・明けは変更不可
      if (
        this.isEmployeeAssignedToShift(employee.id, dateKey, "NIGHT") ||
        this.isEmployeeAssignedToShift(employee.id, dateKey, "MORNING_OFF")
      ) {
        continue;
      }

      // バケーション申請がある日は最優先
      const hasVacationRequest = this.vacationRequests.some(
        (req) =>
          req.employeeId === employee.id &&
          req.date === dateKey.split("-").join("-")
      );

      if (hasVacationRequest) {
        availableDates.unshift({
          date: currentDate,
          dateKey,
          priority: "vacation",
        });
      } else {
        // 公休確保のため、より低い閾値で候補に追加
        const currentStaffCount = this.getTotalStaffCount(dateKey);
        const absoluteMinimum = 1; // 公休確保のため閾値を下げる

        if (currentStaffCount > absoluteMinimum) {
          availableDates.push({
            date: currentDate,
            dateKey,
            priority: "mandatory",
          });
        }
      }
    }

    // 優先度順に休みを設定
    for (const dateInfo of availableDates) {
      if (added >= additionalDays) break;

      this.removeEmployeeFromShifts(employee.id, dateInfo.dateKey);
      this.schedule[dateInfo.dateKey].shifts.OFF.push({
        employee,
        reason:
          dateInfo.priority === "vacation" ? "休暇申請" : "公休（最優先確保）",
      });
      added++;

      console.log(
        `${employee.name}を${dateInfo.dateKey}に強制休み設定 (${dateInfo.priority})`
      );
    }

    return added;
  }

  /**
   * PT21と事務員を活用した代替シフト
   */
  substituteWithPartTimeAndAdmin(
    employee,
    remainingDays,
    startDate,
    totalDays
  ) {
    let substituted = 0;

    for (let day = 0; day < totalDays && substituted < remainingDays; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);
      const dateKey = this.formatDate(currentDate);

      if (!this.schedule[dateKey]) continue;
      if (!this.isEmployeeWorking(employee.id, dateKey)) continue;

      // 夜勤・明けは変更不可
      if (
        this.isEmployeeAssignedToShift(employee.id, dateKey, "NIGHT") ||
        this.isEmployeeAssignedToShift(employee.id, dateKey, "MORNING_OFF")
      ) {
        continue;
      }

      // PT21が日勤できる場合
      const pt21 = this.employees.find((emp) => emp.id === "pt21");
      if (pt21 && this.isEmployeeAssignedToShift(employee.id, dateKey, "DAY")) {
        // PT21 連続勤務上限を超えないか事前チェック（必要なら後で全体再計算で調整）
        // PT21を日勤に配置
        this.removeEmployeeFromShifts(employee.id, dateKey);
        this.schedule[dateKey].shifts.DAY.push({
          employee: pt21,
          reason: "公休確保のため代替",
        });

        // 元従業員を休みに
        this.schedule[dateKey].shifts.OFF.push({
          employee,
          reason: "公休（PT21代替）",
        });

        substituted++;

        this.staffingAlerts.push({
          type: "PART_TIME_SUBSTITUTION",
          severity: "info",
          message: `${employee.name}さんの公休確保のため、${dateKey}にPT21さんが日勤代替しました`,
          employee: employee.name,
          substitute: "PT21",
          date: dateKey,
        });

        continue;
      }

      // 事務員（看護師資格）の活用
      const adminNurses = this.employees.filter(
        (emp) => emp.jobType === "ADMIN" && emp.canWorkAsNurse
      );

      for (const admin of adminNurses) {
        if (this.isEmployeeWorking(admin.id, dateKey)) continue;

        // 事務員を看護師として配置
        if (this.isEmployeeAssignedToShift(employee.id, dateKey, "DAY")) {
          this.removeEmployeeFromShifts(employee.id, dateKey);
          this.schedule[dateKey].shifts.DAY.push({
            employee: admin,
            reason: "公休確保のため事務員看護師代替",
          });

          this.schedule[dateKey].shifts.OFF.push({
            employee,
            reason: "公休（事務員代替）",
          });

          substituted++;

          this.staffingAlerts.push({
            type: "ADMIN_AS_NURSE",
            severity: "info",
            message: `${employee.name}さんの公休確保のため、${dateKey}に${admin.name}さんが看護師として代替しました`,
            employee: employee.name,
            substitute: admin.name,
            date: dateKey,
          });

          break;
        }
      }
    }

    return substituted;
  }

  /**
   * 従業員を休みにできるかチェック（公休確保のため）
   */
  canAddDayOff(employee, date) {
    const dateKey = this.formatDate(date);

    if (!this.schedule[dateKey]) return false;

    // 夜勤の場合は特別な考慮が必要
    if (this.isEmployeeAssignedToShift(employee.id, dateKey, "NIGHT")) {
      return false; // 夜勤は基本的に変更困難
    }

    // 人員不足になる場合はチェック
    const currentStaffCount = this.getTotalStaffCount(dateKey);

    // 最低必要人員を計算（安全なアクセス）
    const dayMinStaff = this.constraints?.shifts?.DAY?.minStaff || 2;
    const lateMinStaff = this.constraints?.shifts?.LATE?.minStaff || 1;
    const minimumRequired = dayMinStaff + lateMinStaff;

    // 最低限の人員は確保する
    if (currentStaffCount <= minimumRequired + 1) {
      // ギリギリの人員の場合は、公休確保を優先
      return (
        employee.jobType !== "正社員" || currentStaffCount > minimumRequired
      );
    }

    return true;
  }

  /**
   * 公休確保のため従業員を強制的に休みにできるかチェック
   */
  canForceEmployeeOff(employee, date) {
    const dateKey = this.formatDate(date);

    if (!this.schedule[dateKey]) return { canOff: false, forced: false };

    // 夜勤の場合は変更不可
    if (this.isEmployeeAssignedToShift(employee.id, dateKey, "NIGHT")) {
      return { canOff: false, forced: false };
    }

    // 明けの場合も基本的に変更不可
    if (this.isEmployeeAssignedToShift(employee.id, dateKey, "MORNING_OFF")) {
      return { canOff: false, forced: false };
    }

    // 通常の休み確保チェック
    if (this.canAddDayOff(employee, date)) {
      return { canOff: true, forced: false };
    }

    // 公休9日確保のため、より積極的にチェック
    const currentStaffCount = this.getTotalStaffCount(dateKey);
    const absoluteMinimum = 2; // 絶対最低人員

    if (currentStaffCount > absoluteMinimum) {
      // 絶対最低人員を上回る場合は強制的に休みにする
      return { canOff: true, forced: true };
    }

    return { canOff: false, forced: false };
  }

  /**
   * 従業員をすべてのシフトから除去
   */
  removeEmployeeFromShifts(employeeId, dateKey) {
    const shiftTypes = [
      "EARLY",
      "DAY",
      "LATE",
      "NIGHT",
      "AM_ONLY",
      "PM_ONLY",
      "MORNING_OFF",
    ];

    shiftTypes.forEach((shiftType) => {
      if (this.schedule[dateKey].shifts[shiftType]) {
        this.schedule[dateKey].shifts[shiftType] = this.schedule[
          dateKey
        ].shifts[shiftType].filter((shift) => shift.employee.id !== employeeId);
      }
    });
  }

  /**
   * 必須人員の確保チェック
   */
  ensureMandatoryStaffing(startDate, days) {
    for (let day = 0; day < days; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);
      const dateKey = this.formatDate(currentDate);

      if (this.schedule[dateKey]) {
        this.checkMandatoryStaffingForDay(dateKey, currentDate);
      }
    }
  }

  /**
   * 1日の必須人員チェック
   */
  checkMandatoryStaffingForDay(dateKey, date) {
    const daySchedule = this.schedule[dateKey];
    const shiftRules = this.constraints.shifts;

    Object.keys(shiftRules).forEach((shiftType) => {
      const rule = shiftRules[shiftType];
      if (!rule.mandatory) return;

      const assignedCount = daySchedule.shifts[shiftType]?.length || 0;
      const requiredCount = rule.requiredSkills.length;

      if (assignedCount < requiredCount) {
        this.staffingAlerts.push({
          type: "insufficient_staff",
          date: this.formatDate(date),
          shift: shiftType,
          required: requiredCount,
          assigned: assignedCount,
          message: `${shiftType}シフトで人員不足: ${assignedCount}/${requiredCount}名`,
        });
      }
    });
  }

  /**
   * パートタイマーのPM必須ルールを適用
   */
  enforcePartTimerPMRule(date) {
    const dateKey = this.formatDate(date);
    const daySchedule = this.schedule[dateKey];

    // パートタイマーを取得
    const partTimers = this.employees.filter(
      (emp) => emp.jobType === "PART_TIME"
    );

    if (partTimers.length < 2) return; // パートが2名未満の場合はスキップ

    // 既にPMに割り当てられているパートタイマーをチェック
    const pmAssignedParts = daySchedule.shifts.PM_ONLY.filter(
      (shift) => shift.employee.jobType === "PART_TIME"
    );

    // 2名未満の場合、追加で割り当て
    // ルール上は最小1名で十分。固定2名配置をやめ、1名不足時のみ補充し、残りのパートは日勤等に回す。
    const needed = 1 - pmAssignedParts.length;
    if (needed > 0) {
      // PM割当回数が少ないパートを優先
      const availableParts = partTimers
        .filter(
          (pt) =>
            pt.id !== "pt21" && !this.isEmployeeAlreadyAssigned(pt.id, dateKey)
        )
        .sort(
          (a, b) =>
            this.countEmployeeShiftAssignments(a.id, "PM_ONLY") -
            this.countEmployeeShiftAssignments(b.id, "PM_ONLY")
        );

      if (availableParts.length > 0) {
        daySchedule.shifts.PM_ONLY.push({
          employee: availableParts[0],
          reason: "パートタイマーPM必須ルール(最小人数)",
        });
      }
    }
  }

  /**
   * 指定シフトの過去割当回数カウント
   */
  countEmployeeShiftAssignments(employeeId, shiftType) {
    let count = 0;
    Object.keys(this.schedule).forEach((dateKey) => {
      if (
        this.schedule[dateKey].shifts[shiftType]?.some(
          (s) => s.employee.id === employeeId
        )
      ) {
        count++;
      }
    });
    return count;
  }

  /**
   * PT21が未稼働かつ日勤最小人数のみの場合に補助として日勤に追加
   */
  addSupplementalDayShiftPartTimer(date) {
    const dateKey = this.formatDate(date);
    const daySchedule = this.schedule[dateKey];
    if (!daySchedule) return;

    const pt21 = this.employees.find((e) => e.id === "pt21");
    if (!pt21) return;

    // 既に勤務していれば不要
    if (this.isEmployeeWorking(pt21.id, dateKey)) return;

    // 連続勤務上限チェック
    if (!this.checkConsecutiveWorkDays(pt21)) return;

    // 日勤シフトが存在するか
    const dayShifts = daySchedule.shifts.DAY || [];
    const rule = this.constraints.shifts.DAY;
    const currentCount = dayShifts.length;
    const minNeeded = rule?.minStaff || 2;

    // 既に最小人数ちょうどの場合のみ補助追加（過剰な埋めすぎ回避）
    if (currentCount >= minNeeded) {
      daySchedule.shifts.DAY.push({
        employee: pt21,
        reason: "日勤補助(PT21)",
        isSupplemental: true,
      });
      this.staffingAlerts.push({
        type: "PART_TIMER_DAY_ASSIST",
        severity: "info",
        date: dateKey,
        employee: pt21.name,
        message: `PT21を日勤補助として配置しました`,
      });
    }
  }

  /**
   * 必須シフトの人員不足チェック
   */
  checkMandatoryStaffing(date) {
    const dateKey = this.formatDate(date);
    const daySchedule = this.schedule[dateKey];
    const dateStr = date.toLocaleDateString("ja-JP");

    Object.entries(SHIFT_RULES).forEach(([shiftType, rule]) => {
      if (!rule.mandatory) return;

      const currentStaff = daySchedule.shifts[shiftType]?.length || 0;
      const requiredStaff = rule.minStaff;

      if (currentStaff < requiredStaff) {
        const shortage = requiredStaff - currentStaff;
        this.staffingAlerts.push({
          type: "STAFF_SHORTAGE",
          severity: "error",
          date: dateStr,
          shift: shiftType,
          shiftName: SHIFT_TYPES[shiftType]?.name || shiftType,
          required: requiredStaff,
          current: currentStaff,
          shortage: shortage,
          message: `${dateStr} ${
            SHIFT_TYPES[shiftType]?.name || shiftType
          }: ${shortage}名不足 (必要${requiredStaff}名/現在${currentStaff}名)`,
        });
      }
    });
  }

  /**
   * 日付のフォーマット
   */
  formatDate(date) {
    return date.toISOString().split("T")[0];
  }

  /**
   * 連続勤務最終チェック（調整）
   * 最終的に6日以上の連続勤務があれば6日目以降を休みに置換
   */
  enforceMaxConsecutiveWorkDays(startDate, days) {
    const maxConsecutive = this.constraints.maxConsecutiveWorkDays || 5; // 6日以上不可 => 5まで
    // 従業員ごとの連続カウンタをリセット
    const counters = {};
    this.employees.forEach((e) => (counters[e.id] = 0));

    for (let day = 0; day < days; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);
      const dateKey = this.formatDate(currentDate);
      if (!this.schedule[dateKey]) continue;

      this.employees.forEach((emp) => {
        const working = this.isEmployeeWorking(emp.id, dateKey);
        if (working) {
          counters[emp.id] = (counters[emp.id] || 0) + 1;
          if (counters[emp.id] > maxConsecutive) {
            // 連続上限超過 -> 当日勤務を休みに差し替え
            this.removeEmployeeFromShifts(emp.id, dateKey);
            this.schedule[dateKey].shifts.OFF.push({
              employee: emp,
              reason: "連続勤務上限超過調整",
              isAutoAssigned: true,
            });
            // カウンタを0に戻す（休みによるリセット）
            counters[emp.id] = 0;
            this.staffingAlerts.push({
              type: "CONSECUTIVE_WORK_ADJUSTMENT",
              severity: "warning",
              date: dateKey,
              employee: emp.name,
              message: `${emp.name}さんが連続勤務上限(${maxConsecutive}日)を超えたため自動で休みに調整しました`,
            });
          }
        } else {
          counters[emp.id] = 0; // リセット
        }
      });
    }
  }
}

/**
 * シンプルなシフト生成関数（デモ用）
 */
export function generateSimpleSchedule(
  employees,
  startDate,
  days,
  vacationRequests = []
) {
  try {
    // 入力値の検証
    if (!employees || !Array.isArray(employees)) {
      throw new Error("従業員データが無効です");
    }

    if (!startDate || !(startDate instanceof Date)) {
      throw new Error("開始日が無効です");
    }

    if (!days || days <= 0) {
      throw new Error("日数が無効です");
    }

    console.log("スケジュール生成開始:", {
      employeeCount: employees.length,
      startDate: startDate.toISOString().split("T")[0],
      days: days,
      vacationRequestCount: vacationRequests ? vacationRequests.length : 0,
    });

    const optimizer = new ShiftOptimizer(employees, {}, vacationRequests);
    const result = optimizer.optimize(startDate, days);

    console.log("スケジュール生成完了:", {
      scheduleKeys: Object.keys(result.schedule).length,
      alertCount: result.alerts.length,
    });

    return result;
  } catch (error) {
    console.error("スケジュール生成エラー:", error);
    throw new Error(
      `スケジュール生成中にエラーが発生しました: ${error.message}`
    );
  }
}
