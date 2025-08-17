"use client";

import React, { useState } from "react";
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Event as EventIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import "dayjs/locale/ja";
import { TEST_VACATION_REQUESTS } from "../data/testData";

dayjs.locale("ja");

export default function VacationRequestManager({
  employees,
  vacationRequests,
  setVacationRequests,
  vacationTypes = {},
  vacationPriorities = {},
  generateMonthlyStats = null,
  groupConsecutiveVacations = null,
}) {
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: "",
    date: null,
    reason: "",
  });

  const handleOpenDialog = () => {
    setFormData({
      employeeId: "",
      date: null,
      reason: "",
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleSaveRequest = () => {
    if (!formData.employeeId || !formData.date) {
      return;
    }

    const newRequest = {
      id: Date.now().toString(),
      employeeId: formData.employeeId,
      date: formData.date.format("YYYY-MM-DD"),
      reason: formData.reason,
      type: "PAID_LEAVE",
      priority: "MEDIUM",
    };

    setVacationRequests([...vacationRequests, newRequest]);
    handleCloseDialog();
  };

  const handleDeleteRequest = (id) => {
    setVacationRequests(vacationRequests.filter((req) => req.id !== id));
  };

  const handleLoadTestData = () => {
    setVacationRequests(TEST_VACATION_REQUESTS);
  };

  const handleClearRequests = () => {
    setVacationRequests([]);
  };

  const formatDate = (dateStr) => {
    return dayjs(dateStr).format("M月D日(ddd)");
  };

  const getReasonColor = (reason) => {
    switch (reason) {
      case "有給休暇":
        return "primary";
      case "病気休暇":
        return "error";
      case "特別休暇":
        return "warning";
      default:
        return "default";
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ja">
      <Box>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 3,
                }}
              >
                <Typography
                  variant="h5"
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  <EventIcon sx={{ mr: 1 }} />
                  休暇希望管理
                </Typography>
                <Box>
                  <Button
                    variant="outlined"
                    onClick={handleLoadTestData}
                    startIcon={<RefreshIcon />}
                    sx={{ mr: 1 }}
                  >
                    テストデータ
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleClearRequests}
                    startIcon={<ClearIcon />}
                    sx={{ mr: 1 }}
                    color="warning"
                  >
                    クリア
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleOpenDialog}
                    startIcon={<AddIcon />}
                  >
                    休暇希望を追加
                  </Button>
                </Box>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                従業員の休暇希望を管理します。追加された希望はシフト作成時に考慮されます。
              </Typography>

              {vacationRequests.length === 0 ? (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 4,
                    textAlign: "center",
                    bgcolor: "grey.50",
                  }}
                >
                  <Typography variant="body1" color="text.secondary">
                    休暇希望がまだ登録されていません
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    「休暇希望を追加」ボタンから新しい希望を登録してください
                  </Typography>
                </Paper>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>従業員名</TableCell>
                        <TableCell>希望日</TableCell>
                        <TableCell>理由</TableCell>
                        <TableCell>操作</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {vacationRequests
                        .sort((a, b) => new Date(a.date) - new Date(b.date))
                        .map((request) => {
                          const employee = employees.find(
                            (emp) => emp.id === request.employeeId
                          );
                          return (
                            <TableRow key={request.id}>
                              <TableCell>
                                {employee?.name || `ID: ${request.employeeId}`}
                              </TableCell>
                              <TableCell>{formatDate(request.date)}</TableCell>
                              <TableCell>
                                <Chip
                                  label={request.reason}
                                  color={getReasonColor(request.reason)}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    handleDeleteRequest(request.id)
                                  }
                                  color="error"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Grid>

          {/* 統計セクション */}
          {generateMonthlyStats && (
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 3 }}>
                <Typography
                  variant="h6"
                  sx={{ mb: 2, display: "flex", alignItems: "center" }}
                >
                  <EventIcon sx={{ mr: 1 }} />
                  休暇統計
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {(() => {
                  const monthlyStats = generateMonthlyStats(vacationRequests);

                  // 全ての月の統計を集計
                  const aggregatedStats = {
                    byType: {},
                    byPriority: {},
                    byEmployee: {},
                  };

                  Object.values(monthlyStats).forEach((monthData) => {
                    // タイプ別集計
                    Object.entries(monthData.byType).forEach(
                      ([type, count]) => {
                        aggregatedStats.byType[type] =
                          (aggregatedStats.byType[type] || 0) + count;
                      }
                    );

                    // 優先度別集計
                    Object.entries(monthData.byPriority).forEach(
                      ([priority, count]) => {
                        aggregatedStats.byPriority[priority] =
                          (aggregatedStats.byPriority[priority] || 0) + count;
                      }
                    );

                    // 従業員別集計
                    Object.entries(monthData.byEmployee).forEach(
                      ([employeeId, count]) => {
                        aggregatedStats.byEmployee[employeeId] =
                          (aggregatedStats.byEmployee[employeeId] || 0) + count;
                      }
                    );
                  });

                  return (
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography
                          variant="subtitle1"
                          sx={{ mb: 1, fontWeight: "bold" }}
                        >
                          休暇タイプ別統計:
                        </Typography>
                        {Object.entries(aggregatedStats.byType).map(
                          ([type, count]) => (
                            <Box key={type} sx={{ mb: 1 }}>
                              <Chip
                                label={`${
                                  vacationTypes[type] || type
                                }: ${count}件`}
                                variant="outlined"
                                size="small"
                                sx={{ mr: 1 }}
                              />
                            </Box>
                          )
                        )}
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Typography
                          variant="subtitle1"
                          sx={{ mb: 1, fontWeight: "bold" }}
                        >
                          優先度別統計:
                        </Typography>
                        {Object.entries(aggregatedStats.byPriority).map(
                          ([priority, count]) => (
                            <Box key={priority} sx={{ mb: 1 }}>
                              <Chip
                                label={`${
                                  vacationPriorities[priority] || priority
                                }: ${count}件`}
                                variant="outlined"
                                size="small"
                                color={
                                  priority === "URGENT"
                                    ? "error"
                                    : priority === "HIGH"
                                    ? "warning"
                                    : "default"
                                }
                                sx={{ mr: 1 }}
                              />
                            </Box>
                          )
                        )}
                      </Grid>

                      <Grid item xs={12}>
                        <Typography
                          variant="subtitle1"
                          sx={{ mb: 1, fontWeight: "bold" }}
                        >
                          従業員別統計:
                        </Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                          {Object.entries(aggregatedStats.byEmployee).map(
                            ([employeeId, count]) => {
                              const employee = employees.find(
                                (emp) => emp.id === employeeId
                              );
                              return (
                                <Chip
                                  key={employeeId}
                                  label={`${
                                    employee?.name || `ID:${employeeId}`
                                  }: ${count}件`}
                                  variant="outlined"
                                  size="small"
                                />
                              );
                            }
                          )}
                        </Box>
                      </Grid>
                    </Grid>
                  );
                })()}
              </Paper>
            </Grid>
          )}
        </Grid>

        {/* 休暇希望追加ダイアログ */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>休暇希望を追加</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>従業員</InputLabel>
                  <Select
                    value={formData.employeeId}
                    label="従業員"
                    onChange={(e) =>
                      setFormData({ ...formData, employeeId: e.target.value })
                    }
                  >
                    {employees.map((employee) => (
                      <MenuItem key={employee.id} value={employee.id}>
                        {employee.name} ({employee.jobType})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <DatePicker
                  label="希望日"
                  value={formData.date}
                  onChange={(newValue) =>
                    setFormData({ ...formData, date: newValue })
                  }
                  slotProps={{
                    textField: {
                      fullWidth: true,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>理由</InputLabel>
                  <Select
                    value={formData.reason}
                    label="理由"
                    onChange={(e) =>
                      setFormData({ ...formData, reason: e.target.value })
                    }
                  >
                    <MenuItem value="有給休暇">有給休暇</MenuItem>
                    <MenuItem value="特別休暇">特別休暇</MenuItem>
                    <MenuItem value="病気休暇">病気休暇</MenuItem>
                    <MenuItem value="その他">その他</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>キャンセル</Button>
            <Button
              onClick={handleSaveRequest}
              variant="contained"
              disabled={!formData.employeeId || !formData.date}
            >
              追加
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
}
