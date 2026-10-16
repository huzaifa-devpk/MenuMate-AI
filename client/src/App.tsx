import { Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/Layout";
import { LandingPage } from "./pages/LandingPage";
import { DashboardPage } from "./pages/DashboardPage";
import { MenuEditorPage } from "./pages/MenuEditorPage";
import { NewMenuPage } from "./pages/NewMenuPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PreviewPage } from "./pages/PreviewPage";
import { PublicMenuPage } from "./pages/PublicMenuPage";
import { QrPage } from "./pages/QrPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/menu/new" element={<NewMenuPage />} />
        <Route path="/menu/:id/edit" element={<MenuEditorPage />} />
        <Route path="/menu/:id/preview" element={<PreviewPage />} />
        <Route path="/menu/:id/qr" element={<QrPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route path="/m/:slug" element={<PublicMenuPage />} />
    </Routes>
  );
}
