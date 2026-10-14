import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { AlertsPage } from "./pages/AlertsPage";
import { AnalyzePage } from "./pages/AnalyzePage";
import { CampaignsPage } from "./pages/CampaignsPage";
import { CopilotPage } from "./pages/CopilotPage";
import { DiscoveryPage } from "./pages/DiscoveryPage";
import { InvestigationDetailPage } from "./pages/InvestigationDetailPage";
import { InvestigationsPage } from "./pages/InvestigationsPage";
import { OverviewPage } from "./pages/OverviewPage";
import { IntelligenceFieldPage, shouldShowIntelligenceField } from "./pages/IntelligenceFieldPage";

function HomeRoute() {
  return shouldShowIntelligenceField() ? <IntelligenceFieldPage /> : <Navigate to="/overview" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/welcome" element={<IntelligenceFieldPage />} />
      <Route element={<AppLayout />}>
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/analyze" element={<AnalyzePage />} />
        <Route path="/investigations" element={<InvestigationsPage />} />
        <Route path="/investigations/:adId" element={<InvestigationDetailPage />} />
        <Route path="/campaigns" element={<CampaignsPage />} />
        <Route path="/campaigns/:campaignId" element={<CampaignsPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/discovery" element={<DiscoveryPage />} />
        <Route path="/copilot" element={<CopilotPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
