"use client";

import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
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
  Chip,
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
} from "@mui/icons-material";

import { JOB_TYPES, EMPLOYMENT_TYPES } from "../data/constants";
import { TEST_EMPLOYEES } from "../data/testData";

export default function EmployeeManager({ employees, setEmployees }) {
  const [openDialog, setOpenDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    jobType: "",
    employmentType: "",
    skills: [],
  });

  const handleOpenDialog = (employee = null) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({ ...employee });
    } else {
      setEditingEmployee(null);
      setFormData({
        name: "",
        jobType: "",
        employmentType: "",
        skills: [],
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingEmployee(null);
  };

  const handleSaveEmployee = () => {
    if (!formData.name || !formData.jobType || !formData.employmentType) {
      return;
    }

    if (editingEmployee) {
      // 編集
      setEmployees(
        employees.map((emp) =>
          emp.id === editingEmployee.id
            ? { ...formData, id: editingEmployee.id }
            : emp
        )
      );
    } else {
      // 新規追加
      const newEmployee = {
        ...formData,
        id: Date.now().toString(),
      };
      setEmployees([...employees, newEmployee]);
    }

    handleCloseDialog();
  };

  const handleDeleteEmployee = (employeeId) => {
    setEmployees(employees.filter((emp) => emp.id !== employeeId));
  };

  const handleLoadTestData = () => {
    setEmployees(TEST_EMPLOYEES);
  };

  const handleClearAllEmployees = () => {
    setEmployees([]);
  };

  const getJobTypeLabel = (jobType) => {
    return JOB_TYPES[jobType]?.name || jobType;
  };

  const getEmploymentTypeLabel = (employmentType) => {
    return EMPLOYMENT_TYPES[employmentType]?.name || employmentType;
  };

  const getJobTypeColor = (jobType) => {
    const colors = {
      NURSE: "success",
      CAREGIVER: "primary",
      PART_TIME: "warning",
      ADMIN: "secondary",
    };
    return colors[jobType] || "default";
  };

  return (
    <Box>
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
            variant="h6"
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <PersonIcon />
            従業員管理
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ClearIcon />}
              onClick={handleClearAllEmployees}
              color="error"
            >
              全削除
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={handleLoadTestData}
            >
              テストデータ
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              従業員を追加
            </Button>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {employees.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              従業員が登録されていません。「従業員を追加」ボタンから追加してください。
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>氏名</TableCell>
                  <TableCell>職種</TableCell>
                  <TableCell>雇用形態</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>{employee.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={getJobTypeLabel(employee.jobType)}
                        color={getJobTypeColor(employee.jobType)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {getEmploymentTypeLabel(employee.employmentType)}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(employee)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteEmployee(employee.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* 従業員追加・編集ダイアログ */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingEmployee ? "従業員を編集" : "新しい従業員を追加"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="氏名"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>職種</InputLabel>
                <Select
                  value={formData.jobType}
                  label="職種"
                  onChange={(e) =>
                    setFormData({ ...formData, jobType: e.target.value })
                  }
                >
                  {Object.entries(JOB_TYPES).map(([key, value]) => (
                    <MenuItem key={key} value={key}>
                      {value.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>雇用形態</InputLabel>
                <Select
                  value={formData.employmentType}
                  label="雇用形態"
                  onChange={(e) =>
                    setFormData({ ...formData, employmentType: e.target.value })
                  }
                >
                  {Object.entries(EMPLOYMENT_TYPES).map(([key, value]) => (
                    <MenuItem key={key} value={key}>
                      {value.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>キャンセル</Button>
          <Button
            onClick={handleSaveEmployee}
            variant="contained"
            disabled={
              !formData.name || !formData.jobType || !formData.employmentType
            }
          >
            {editingEmployee ? "更新" : "追加"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
