import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/auth-context";
import { Navbar } from "./components/Navbar";
import { RequireAuth } from "./components/RequireAuth";
import { Explorer } from "./pages/Explorer";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { EventDetail } from "./pages/EventDetail";
import { CreateEvent } from "./pages/CreateEvent";
import { MyTickets } from "./pages/MyTickets";
import { VideoFeed } from "./pages/VideoFeed";
import { UploadVideo } from "./pages/UploadVideo";
import { Account } from "./pages/Account";
import { NotFound } from "./pages/NotFound";
import { DashboardLayout } from "./pages/dashboard/DashboardLayout";
import { EventsTab } from "./pages/dashboard/EventsTab";
import { TicketingTab } from "./pages/dashboard/TicketingTab";
import { AnalyticsTab } from "./pages/dashboard/AnalyticsTab";
import { SubscriptionTab } from "./pages/dashboard/SubscriptionTab";

// LiveKit (salle live) et le scanner caméra sont les deux plus grosses
// dépendances du bundle — chargées seulement quand on entre réellement sur
// ces pages, pas au premier chargement de l'app.
const LiveRoom = lazy(() => import("./pages/LiveRoom").then((m) => ({ default: m.LiveRoom })));
const Scanner = lazy(() => import("./pages/Scanner").then((m) => ({ default: m.Scanner })));

function PageLoading() {
  return <div className="flex h-[60vh] items-center justify-center text-muted">Chargement…</div>;
}

function Shell() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Explorer />} />
        <Route path="/videos" element={<VideoFeed />} />
        <Route path="/videos/nouvelle" element={<RequireAuth><UploadVideo /></RequireAuth>} />
        <Route path="/connexion" element={<Login />} />
        <Route path="/inscription" element={<Register />} />
        <Route path="/evenements/:id" element={<EventDetail />} />
        <Route path="/creer" element={<RequireAuth><CreateEvent /></RequireAuth>} />
        <Route path="/salle/:id" element={<RequireAuth><Suspense fallback={<PageLoading />}><LiveRoom /></Suspense></RequireAuth>} />
        <Route path="/billets" element={<RequireAuth><MyTickets /></RequireAuth>} />
        <Route path="/scanner/:id" element={<RequireAuth><Suspense fallback={<PageLoading />}><Scanner /></Suspense></RequireAuth>} />
        <Route path="/compte" element={<RequireAuth><Account /></RequireAuth>} />
        <Route path="/tableau-de-bord" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
          <Route index element={<EventsTab />} />
          <Route path="billetterie" element={<TicketingTab />} />
          <Route path="analytique" element={<AnalyticsTab />} />
          <Route path="abonnement" element={<SubscriptionTab />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
