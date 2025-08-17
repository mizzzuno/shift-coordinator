"use client";

import React, { useState } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Alert,
  Tabs,
  Tab,
  Divider,
} from "@mui/material";
import {
  Download as DownloadIcon,
  Calculate as CalculateIcon,
  People as PeopleIcon,
  Event as EventIcon,
} from "@mui/icons-material";

import EmployeeManager from "./EmployeeManager";
import VacationRequestManager from "./VacationRequestManager";
import ScheduleDisplay from "./ScheduleDisplay";
import ScheduleSettings from "./ScheduleSettings";

import { generateSimpleSchedule } from "../utils/shiftOptimizer";
import { exportToExcel, exportToCSV } from "../utils/excelExport";
import {
  TEST_EMPLOYEES,
  TEST_VACATION_REQUESTS,
  VACATION_TYPES,
  VACATION_PRIORITIES,
  generateMonthlyVacationStats,
  groupConsecutiveVacations,
} from "../data/testData";

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ShiftScheduler() {
  const [activeTab, setActiveTab] = useState(0);
  const [employees, setEmployees] = useState(TEST_EMPLOYEES);
  const [vacationRequests, setVacationRequests] = useState(
    TEST_VACATION_REQUESTS
  );
  const [schedule, setSchedule] = useState(null);
  const [scheduleAlerts, setScheduleAlerts] = useState([]);

  // 現在の年月を取得
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const daysInCurrentMonth = new Date(currentYear, currentMonth, 0).getDate();

  const [scheduleSettings, setScheduleSettings] = useState({
    year: currentYear,
    month: currentMonth,
    startDate: new Date(currentYear, currentMonth - 1, 1),
    days: daysInCurrentMonth,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const generateSchedule = async () => {
    if (employees.length === 0) {
      setError("従業員を追加してください");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = generateSimpleSchedule(
        employees,
        scheduleSettings.startDate,
        scheduleSettings.days,
        vacationRequests
      );

      setSchedule(result.schedule);
      setScheduleAlerts(result.alerts || []);
      setActiveTab(3); // スケジュール表示タブに移動
    } catch (err) {
      setError("スケジュール生成中にエラーが発生しました: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!schedule) {
      setError("まずスケジュールを生成してください");
      return;
    }

    try {
      exportToExcel(
        schedule,
        employees,
        `勤務表_${new Date().toISOString().split("T")[0]}.xlsx`
      );
    } catch (err) {
      setError("Excelエクスポート中にエラーが発生しました: " + err.message);
    }
  };

  const handleExportCSV = () => {
    if (!schedule) {
      setError("まずスケジュールを生成してください");
      return;
    }

    try {
      exportToCSV(
        schedule,
        employees,
        `勤務表_${new Date().toISOString().split("T")[0]}.csv`
      );
    } catch (err) {
      setError("CSVエクスポート中にエラーが発生しました: " + err.message);
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {scheduleAlerts.length > 0 && (
        <Box sx={{ mb: 2 }}>
          {scheduleAlerts.map((alert, index) => (
            <Alert
              key={index}
              severity={alert.severity}
              sx={{ mb: 1 }}
              onClose={() => {
                setScheduleAlerts(scheduleAlerts.filter((_, i) => i !== index));
              }}
            >
              <strong>
                {alert.type === "STAFF_SHORTAGE" && "人員不足警告"}
                {alert.type === "MANDATORY_DAYS_OFF_SHORTAGE" && "公休不足警告"}
                {alert.type === "ADMIN_AS_NURSE" && "事務員看護師配置"}
                {alert.type === "NURSE_AS_CAREGIVER" && "看護師介護士配置"}
                {alert.type === "FORCED_DAY_OFF" && "強制公休設定"}
                {alert.type === "PART_TIME_SUBSTITUTION" && "パート代替配置"}
                {![
                  "STAFF_SHORTAGE",
                  "MANDATORY_DAYS_OFF_SHORTAGE",
                  "ADMIN_AS_NURSE",
                  "NURSE_AS_CAREGIVER",
                  "FORCED_DAY_OFF",
                  "PART_TIME_SUBSTITUTION",
                ].includes(alert.type) && "アラート"}
                :
              </strong>{" "}
              {alert.message}
            </Alert>
          ))}
        </Box>
      )}

      <Paper elevation={1} sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab icon={<PeopleIcon />} label="従業員管理" iconPosition="start" />
          <Tab icon={<EventIcon />} label="休暇希望" iconPosition="start" />
          <Tab
            icon={<CalculateIcon />}
            label="設定・生成"
            iconPosition="start"
          />
          <Tab icon={<DownloadIcon />} label="勤務表" iconPosition="start" />
        </Tabs>
      </Paper>

      <TabPanel value={activeTab} index={0}>
        <EmployeeManager employees={employees} setEmployees={setEmployees} />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <VacationRequestManager
          employees={employees}
          vacationRequests={vacationRequests}
          setVacationRequests={setVacationRequests}
          vacationTypes={VACATION_TYPES}
          vacationPriorities={VACATION_PRIORITIES}
          generateMonthlyStats={generateMonthlyVacationStats}
          groupConsecutiveVacations={groupConsecutiveVacations}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <ScheduleSettings
              settings={scheduleSettings}
              setSettings={setScheduleSettings}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3, height: "100%" }}>
              <Typography variant="h6" gutterBottom>
                スケジュール生成
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                従業員情報と休暇希望を基に、最適なシフト表を自動生成します。
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="body2">
                  • 登録従業員数: {employees.length}名
                </Typography>
                <Typography variant="body2">
                  • 休暇希望数: {vacationRequests.length}件
                </Typography>
                <Typography variant="body2">
                  • 生成期間: {scheduleSettings.days}日間
                </Typography>

                <Button
                  variant="contained"
                  size="large"
                  onClick={generateSchedule}
                  disabled={loading || employees.length === 0}
                  startIcon={<CalculateIcon />}
                  sx={{ mt: 2 }}
                >
                  {loading ? "生成中..." : "シフト表を生成"}
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        <ScheduleDisplay
          schedule={schedule}
          employees={employees}
          alerts={scheduleAlerts}
          onExportExcel={handleExportExcel}
          onExportCSV={handleExportCSV}
        />
      </TabPanel>
    </Box>
  );
}
