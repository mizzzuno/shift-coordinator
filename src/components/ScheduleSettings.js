"use client";

import React from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Grid,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Settings as SettingsIcon } from "@mui/icons-material";
import dayjs from "dayjs";
import "dayjs/locale/ja";

dayjs.locale("ja");

export default function ScheduleSettings({ settings, setSettings }) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const years = [];
  for (let i = currentYear - 1; i <= currentYear + 2; i++) {
    years.push(i);
  }

  const months = [
    { value: 1, label: "1月" },
    { value: 2, label: "2月" },
    { value: 3, label: "3月" },
    { value: 4, label: "4月" },
    { value: 5, label: "5月" },
    { value: 6, label: "6月" },
    { value: 7, label: "7月" },
    { value: 8, label: "8月" },
    { value: 9, label: "9月" },
    { value: 10, label: "10月" },
    { value: 11, label: "11月" },
    { value: 12, label: "12月" },
  ];

  const handleYearChange = (event) => {
    const year = event.target.value;
    const month = settings.month || currentMonth;
    const startDate = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();

    setSettings({
      ...settings,
      year,
      month,
      startDate,
      days: daysInMonth,
    });
  };

  const handleMonthChange = (event) => {
    const month = event.target.value;
    const year = settings.year || currentYear;
    const startDate = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();

    setSettings({
      ...settings,
      year,
      month,
      startDate,
      days: daysInMonth,
    });
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ja">
      <Paper elevation={2} sx={{ p: 3, height: "100%" }}>
        <Typography
          variant="h6"
          gutterBottom
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <SettingsIcon />
          スケジュール設定
        </Typography>

        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>年</InputLabel>
              <Select
                value={settings.year || currentYear}
                label="年"
                onChange={handleYearChange}
              >
                {years.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}年
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>月</InputLabel>
              <Select
                value={settings.month || currentMonth}
                label="月"
                onChange={handleMonthChange}
              >
                {months.map((month) => (
                  <MenuItem key={month.value} value={month.value}>
                    {month.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                生成期間
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {settings.year || currentYear}年{settings.month || currentMonth}
                月 （
                {settings.days ||
                  new Date(
                    settings.year || currentYear,
                    settings.month || currentMonth,
                    0
                  ).getDate()}
                日間）
              </Typography>
              <Typography
                variant="body2"
                color="primary"
                sx={{ mt: 1, fontWeight: "bold" }}
              >
                ⚠️ 公休9日は必須確保されます
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, p: 2, bgcolor: "info.light", borderRadius: 1 }}>
          <Typography
            variant="subtitle2"
            sx={{ mb: 1, color: "info.contrastText" }}
          >
            シフトルール（現在の設定）
          </Typography>
          <Typography variant="body2" sx={{ color: "info.contrastText" }}>
            • 早番・日勤・夜勤：看護師1名 + 介護士1名必須
          </Typography>
          <Typography variant="body2" sx={{ color: "info.contrastText" }}>
            • 遅番：看護師または介護士1名必須
          </Typography>
          <Typography variant="body2" sx={{ color: "info.contrastText" }}>
            • 夜勤の翌日は自動的に夜勤明け休日
          </Typography>
          <Typography variant="body2" sx={{ color: "info.contrastText" }}>
            • 夜勤明けの次の日は基本的に休み（人手不足時は調整）
          </Typography>
          <Typography variant="body2" sx={{ color: "info.contrastText" }}>
            • 月9日の公休が全員必須
          </Typography>
          <Typography variant="body2" sx={{ color: "info.contrastText" }}>
            • 夜勤は可能な限り全員均等に分散
          </Typography>
          <Typography variant="body2" sx={{ color: "info.contrastText" }}>
            • パートタイマー：1名は日勤で看護師代用可、残り2名はPM必須
          </Typography>
          <Typography variant="body2" sx={{ color: "info.contrastText" }}>
            • 必須シフトの人員不足時はアラート表示
          </Typography>
        </Box>
      </Paper>
    </LocalizationProvider>
  );
}
