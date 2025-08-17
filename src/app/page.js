"use client";

import { Container, Typography, Box, Paper } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import ShiftScheduler from "../components/ShiftScheduler";

const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#dc004e",
    },
  },
  typography: {
    h4: {
      fontWeight: 600,
    },
  },
});

export default function Home() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            老人ホーム勤務表作成システム
          </Typography>
          <Typography variant="subtitle1" align="center" color="text.secondary">
            シフトのルールと休暇希望を入力して、最適な勤務表を自動作成
          </Typography>
        </Box>

        <Paper elevation={3} sx={{ p: 3 }}>
          <ShiftScheduler />
        </Paper>
      </Container>
    </ThemeProvider>
  );
}
