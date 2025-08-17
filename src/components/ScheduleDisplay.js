"use client";

import React from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
  Alert,
} from "@mui/material";
import {
  Download as DownloadIcon,
  TableChart as TableChartIcon,
  GetApp as GetAppIcon,
} from "@mui/icons-material";

import { SHIFT_TYPES, WEEKDAYS } from "../data/constants";

export default function ScheduleDisplay({
  schedule,
  employees,
  onExportExcel,
  onExportCSV,
}) {
  if (!schedule) {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Alert severity="info">まずはスケジュールを生成してください。</Alert>
      </Paper>
    );
  }

  const dates = Object.keys(schedule).sort();

  const getShiftForEmployee = (employeeId, date) => {
    const daySchedule = schedule[date];
    if (!daySchedule) return "休";

    for (const [shiftType, shifts] of Object.entries(daySchedule.shifts)) {
      const foundShift = shifts.find(
        (shift) => shift.employee.id === employeeId
      );
      if (foundShift) {
        return SHIFT_TYPES[shiftType]?.code || shiftType;
      }
    }
    return "休";
  };

  const getShiftColor = (shiftCode) => {
    const shiftType = Object.keys(SHIFT_TYPES).find(
      (key) => SHIFT_TYPES[key].code === shiftCode
    );
    return shiftType ? SHIFT_TYPES[shiftType].color : "#fafafa";
  };

  const getDayOfWeek = (dateString) => {
    const date = new Date(dateString);
    return WEEKDAYS[date.getDay()];
  };

  const getSummaryStats = () => {
    const stats = {};
    Object.keys(SHIFT_TYPES).forEach((shiftType) => {
      stats[shiftType] = 0;
    });

    dates.forEach((date) => {
      const daySchedule = schedule[date];
      Object.entries(daySchedule.shifts).forEach(([shiftType, shifts]) => {
        stats[shiftType] += shifts.length;
      });
    });

    return stats;
  };

  const getNightShiftStats = () => {
    const nightShiftCounts = {};

    employees.forEach((employee) => {
      nightShiftCounts[employee.id] = {
        name: employee.name,
        count: 0,
        jobType: employee.jobType,
      };
    });

    dates.forEach((date) => {
      const daySchedule = schedule[date];
      daySchedule.shifts.NIGHT?.forEach((shift) => {
        if (nightShiftCounts[shift.employee.id]) {
          nightShiftCounts[shift.employee.id].count++;
        }
      });
    });

    return Object.values(nightShiftCounts).sort((a, b) => b.count - a.count);
  };

  const getDaysOffStats = () => {
    const daysOffCounts = {};

    employees.forEach((employee) => {
      daysOffCounts[employee.id] = {
        name: employee.name,
        daysOff: 0,
        workDays: 0,
      };
    });

    dates.forEach((date) => {
      const daySchedule = schedule[date];

      employees.forEach((employee) => {
        const isWorking = Object.entries(daySchedule.shifts).some(
          ([shiftType, shifts]) => {
            if (shiftType === "OFF" || shiftType === "MORNING_OFF")
              return false;
            return shifts.some((shift) => shift.employee.id === employee.id);
          }
        );

        if (isWorking) {
          daysOffCounts[employee.id].workDays++;
        } else {
          daysOffCounts[employee.id].daysOff++;
        }
      });
    });

    return Object.values(daysOffCounts);
  };

  // 従業員別の横軸集計
  const getEmployeeStats = (employeeId) => {
    const stats = {
      公休: 0,
      日勤: 0,
      早番: 0,
      遅番: 0,
      夜勤: 0,
      夜勤明け: 0,
      午前のみ: 0,
      午後のみ: 0,
    };

    dates.forEach((date) => {
      const daySchedule = schedule[date];
      let hasShift = false;

      // 各シフトをチェック
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
            case "AM_ONLY":
              stats.午前のみ++;
              break;
            case "PM_ONLY":
              stats.午後のみ++;
              break;
            case "OFF":
              stats.公休++;
              break;
          }
        }
      });

      // どのシフトにも割り当てられていない場合は公休
      if (!hasShift) {
        stats.公休++;
      }
    });

    return stats;
  };

  // 日別の縦軸集計
  const getDailyStats = (date) => {
    const daySchedule = schedule[date];
    return {
      早番: daySchedule.shifts.EARLY?.length || 0,
      日勤: daySchedule.shifts.DAY?.length || 0,
      遅番: daySchedule.shifts.LATE?.length || 0,
      夜勤: daySchedule.shifts.NIGHT?.length || 0,
    };
  };

  const summaryStats = getSummaryStats();
  const nightShiftStats = getNightShiftStats();
  const daysOffStats = getDaysOffStats();

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography
            variant="h6"
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <TableChartIcon />
            生成された勤務表
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<GetAppIcon />}
              onClick={onExportCSV}
            >
              CSV出力
            </Button>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={onExportExcel}
            >
              Excel出力
            </Button>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* サマリー統計 */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" gutterBottom>
              シフト別合計
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {Object.entries(summaryStats).map(([shiftType, count]) => {
                const shiftInfo = SHIFT_TYPES[shiftType];
                if (!shiftInfo || count === 0) return null;
                return (
                  <Chip
                    key={shiftType}
                    label={`${shiftInfo.name}: ${count}回`}
                    size="small"
                    sx={{ bgcolor: shiftInfo.color }}
                  />
                );
              })}
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" gutterBottom>
              夜勤回数（従業員別）
            </Typography>
            <Box sx={{ maxHeight: 120, overflowY: "auto" }}>
              {nightShiftStats.map((stat, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.875rem",
                  }}
                >
                  <span>{stat.name}</span>
                  <span>{stat.count}回</span>
                </Box>
              ))}
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" gutterBottom>
              休日数（従業員別）
            </Typography>
            <Box sx={{ maxHeight: 120, overflowY: "auto" }}>
              {daysOffStats.map((stat, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.875rem",
                  }}
                >
                  <span>{stat.name}</span>
                  <span
                    style={{ color: stat.daysOff < 9 ? "#d32f2f" : "inherit" }}
                  >
                    {stat.daysOff}日
                  </span>
                </Box>
              ))}
            </Box>
          </Grid>
        </Grid>

        {/* メインの勤務表 */}
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 120, bgcolor: "grey.100" }}>
                  従業員名
                </TableCell>
                <TableCell sx={{ minWidth: 80, bgcolor: "grey.100" }}>
                  職種
                </TableCell>
                {dates.map((date) => {
                  const dateObj = new Date(date);
                  const day = dateObj.getDate();
                  const dayOfWeek = getDayOfWeek(date);
                  const isWeekend =
                    dateObj.getDay() === 0 || dateObj.getDay() === 6;

                  return (
                    <TableCell
                      key={date}
                      align="center"
                      sx={{
                        minWidth: 60,
                        bgcolor: isWeekend ? "error.light" : "grey.100",
                        color: isWeekend
                          ? "error.contrastText"
                          : "text.primary",
                        fontSize: "0.75rem",
                      }}
                    >
                      <Box>
                        <div>{day}</div>
                        <div>({dayOfWeek})</div>
                      </Box>
                    </TableCell>
                  );
                })}
                {/* 横軸集計列のヘッダー */}
                <TableCell
                  sx={{
                    minWidth: 50,
                    bgcolor: "primary.light",
                    color: "primary.contrastText",
                    fontSize: "0.75rem",
                  }}
                  align="center"
                >
                  公休
                </TableCell>
                <TableCell
                  sx={{
                    minWidth: 50,
                    bgcolor: "primary.light",
                    color: "primary.contrastText",
                    fontSize: "0.75rem",
                  }}
                  align="center"
                >
                  日勤
                </TableCell>
                <TableCell
                  sx={{
                    minWidth: 50,
                    bgcolor: "primary.light",
                    color: "primary.contrastText",
                    fontSize: "0.75rem",
                  }}
                  align="center"
                >
                  早番
                </TableCell>
                <TableCell
                  sx={{
                    minWidth: 50,
                    bgcolor: "primary.light",
                    color: "primary.contrastText",
                    fontSize: "0.75rem",
                  }}
                  align="center"
                >
                  遅番
                </TableCell>
                <TableCell
                  sx={{
                    minWidth: 50,
                    bgcolor: "primary.light",
                    color: "primary.contrastText",
                    fontSize: "0.75rem",
                  }}
                  align="center"
                >
                  夜勤
                </TableCell>
                <TableCell
                  sx={{
                    minWidth: 50,
                    bgcolor: "primary.light",
                    color: "primary.contrastText",
                    fontSize: "0.75rem",
                  }}
                  align="center"
                >
                  明け
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell sx={{ fontWeight: "medium" }}>
                    {employee.name}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={employee.jobType}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  {dates.map((date) => {
                    const shiftCode = getShiftForEmployee(employee.id, date);
                    const bgColor = getShiftColor(shiftCode);

                    return (
                      <TableCell
                        key={date}
                        align="center"
                        sx={{
                          bgcolor: bgColor,
                          fontWeight: "bold",
                          fontSize: "0.875rem",
                        }}
                      >
                        {shiftCode}
                      </TableCell>
                    );
                  })}
                  {/* 横軸集計データ */}
                  {(() => {
                    const employeeStats = getEmployeeStats(employee.id);
                    return (
                      <>
                        <TableCell
                          align="center"
                          sx={{
                            bgcolor: "primary.light",
                            color: "primary.contrastText",
                            fontWeight: "bold",
                            fontSize: "0.875rem",
                          }}
                        >
                          {employeeStats.公休}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            bgcolor: "primary.light",
                            color: "primary.contrastText",
                            fontWeight: "bold",
                            fontSize: "0.875rem",
                          }}
                        >
                          {employeeStats.日勤}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            bgcolor: "primary.light",
                            color: "primary.contrastText",
                            fontWeight: "bold",
                            fontSize: "0.875rem",
                          }}
                        >
                          {employeeStats.早番}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            bgcolor: "primary.light",
                            color: "primary.contrastText",
                            fontWeight: "bold",
                            fontSize: "0.875rem",
                          }}
                        >
                          {employeeStats.遅番}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            bgcolor: "primary.light",
                            color: "primary.contrastText",
                            fontWeight: "bold",
                            fontSize: "0.875rem",
                          }}
                        >
                          {employeeStats.夜勤}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            bgcolor: "primary.light",
                            color: "primary.contrastText",
                            fontWeight: "bold",
                            fontSize: "0.875rem",
                          }}
                        >
                          {employeeStats.夜勤明け}
                        </TableCell>
                      </>
                    );
                  })()}
                </TableRow>
              ))}

              {/* 縦軸集計行 */}
              <TableRow sx={{ bgcolor: "secondary.light" }}>
                <TableCell
                  sx={{ fontWeight: "bold", color: "secondary.contrastText" }}
                >
                  早番人数
                </TableCell>
                <TableCell sx={{ color: "secondary.contrastText" }}>
                  -
                </TableCell>
                {dates.map((date) => {
                  const dailyStats = getDailyStats(date);
                  return (
                    <TableCell
                      key={`early-${date}`}
                      align="center"
                      sx={{
                        bgcolor: "secondary.light",
                        color: "secondary.contrastText",
                        fontWeight: "bold",
                        fontSize: "0.875rem",
                      }}
                    >
                      {dailyStats.早番}
                    </TableCell>
                  );
                })}
                {/* 横軸集計列は空白 */}
                <TableCell sx={{ bgcolor: "secondary.light" }}></TableCell>
                <TableCell sx={{ bgcolor: "secondary.light" }}></TableCell>
                <TableCell sx={{ bgcolor: "secondary.light" }}></TableCell>
                <TableCell sx={{ bgcolor: "secondary.light" }}></TableCell>
                <TableCell sx={{ bgcolor: "secondary.light" }}></TableCell>
                <TableCell sx={{ bgcolor: "secondary.light" }}></TableCell>
              </TableRow>

              <TableRow sx={{ bgcolor: "secondary.light" }}>
                <TableCell
                  sx={{ fontWeight: "bold", color: "secondary.contrastText" }}
                >
                  日勤人数
                </TableCell>
                <TableCell sx={{ color: "secondary.contrastText" }}>
                  -
                </TableCell>
                {dates.map((date) => {
                  const dailyStats = getDailyStats(date);
                  return (
                    <TableCell
                      key={`day-${date}`}
                      align="center"
                      sx={{
                        bgcolor: "secondary.light",
                        color: "secondary.contrastText",
                        fontWeight: "bold",
                        fontSize: "0.875rem",
                      }}
                    >
                      {dailyStats.日勤}
                    </TableCell>
                  );
                })}
                <TableCell sx={{ bgcolor: "secondary.light" }}></TableCell>
                <TableCell sx={{ bgcolor: "secondary.light" }}></TableCell>
                <TableCell sx={{ bgcolor: "secondary.light" }}></TableCell>
                <TableCell sx={{ bgcolor: "secondary.light" }}></TableCell>
                <TableCell sx={{ bgcolor: "secondary.light" }}></TableCell>
                <TableCell sx={{ bgcolor: "secondary.light" }}></TableCell>
              </TableRow>

              <TableRow sx={{ bgcolor: "secondary.light" }}>
                <TableCell
                  sx={{ fontWeight: "bold", color: "secondary.contrastText" }}
                >
                  遅番人数
                </TableCell>
                <TableCell sx={{ color: "secondary.contrastText" }}>
                  -
                </TableCell>
                {dates.map((date) => {
                  const dailyStats = getDailyStats(date);
                  return (
                    <TableCell
                      key={`late-${date}`}
                      align="center"
                      sx={{
                        bgcolor: "secondary.light",
                        color: "secondary.contrastText",
                        fontWeight: "bold",
                        fontSize: "0.875rem",
                      }}
                    >
                      {dailyStats.遅番}
                    </TableCell>
                  );
                })}
                <TableCell sx={{ bgcolor: "secondary.light" }}></TableCell>
                <TableCell sx={{ bgcolor: "secondary.light" }}></TableCell>
                <TableCell sx={{ bgcolor: "secondary.light" }}></TableCell>
                <TableCell sx={{ bgcolor: "secondary.light" }}></TableCell>
                <TableCell sx={{ bgcolor: "secondary.light" }}></TableCell>
                <TableCell sx={{ bgcolor: "secondary.light" }}></TableCell>
              </TableRow>

              <TableRow sx={{ bgcolor: "secondary.light" }}>
                <TableCell
                  sx={{ fontWeight: "bold", color: "secondary.contrastText" }}
                >
                  夜勤人数
                </TableCell>
                <TableCell sx={{ color: "secondary.contrastText" }}>
                  -
                </TableCell>
                {dates.map((date) => {
                  const dailyStats = getDailyStats(date);
                  return (
                    <TableCell
                      key={`night-${date}`}
                      align="center"
                      sx={{
                        bgcolor: "secondary.light",
                        color: "secondary.contrastText",
                        fontWeight: "bold",
                        fontSize: "0.875rem",
                      }}
                    >
                      {dailyStats.夜勤}
                    </TableCell>
                  );
                })}
                <TableCell sx={{ bgcolor: "secondary.light" }}></TableCell>
                <TableCell sx={{ bgcolor: "secondary.light" }}></TableCell>
                <TableCell sx={{ bgcolor: "secondary.light" }}></TableCell>
                <TableCell sx={{ bgcolor: "secondary.light" }}></TableCell>
                <TableCell sx={{ bgcolor: "secondary.light" }}></TableCell>
                <TableCell sx={{ bgcolor: "secondary.light" }}></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* 凡例 */}
        <Box sx={{ mt: 3, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            シフト記号
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {Object.entries(SHIFT_TYPES).map(([key, shift]) => (
              <Chip
                key={key}
                label={`${shift.code}: ${shift.name}`}
                size="small"
                sx={{ bgcolor: shift.color }}
              />
            ))}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
