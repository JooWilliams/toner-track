import { Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import Dashboard from "./routes/Dashboard";
import Printers from "./routes/Printers";
import RegisterChange from "./routes/RegisterChange";
import History from "./routes/History";
import Reports from "./routes/Reports";
import Audit from "./routes/Audit";
import { AuthGate } from "./components/AuthGate";

export default function App() {
  return (
    <AuthGate>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/impressoras" element={<Printers />} />
          <Route path="/registrar" element={<RegisterChange />} />
          <Route path="/historico" element={<History />} />
          <Route path="/auditoria" element={<Audit />} />
          <Route path="/relatorios" element={<Reports />} />
          <Route path="*" element={<Dashboard />} />
        </Route>
      </Routes>
    </AuthGate>
  );
}
