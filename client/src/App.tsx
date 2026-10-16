import { Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/Layout";
import { LandingPage } from "./pages/LandingPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { Construction } from "lucide-react";
import { ButtonLink, EmptyState } from "./components/ui";

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="container-page py-20">
      <div className="mx-auto max-w-lg">
        <EmptyState icon={Construction} title={title} description="This page is part of the next build phase." action={<ButtonLink to="/">Back to home</ButtonLink>} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<ComingSoon title="Dashboard" />} />
        <Route path="/menu/new" element={<ComingSoon title="Create a menu" />} />
        <Route path="/menu/:id/edit" element={<ComingSoon title="Menu editor" />} />
        <Route path="/menu/:id/preview" element={<ComingSoon title="Menu preview" />} />
        <Route path="/menu/:id/qr" element={<ComingSoon title="QR code & sharing" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route path="/m/:slug" element={<ComingSoon title="Public menu" />} />
    </Routes>
  );
}
