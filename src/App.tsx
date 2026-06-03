import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/lib/store";
import { PinGate } from "@/components/PinGate";
import { AuthProvider } from "@/components/AuthProvider";
import HomePage from "./pages/Index";
import ChecklistPage from "./pages/Checklist";
import LongTermChecklistPage from "./pages/LongTermChecklist";
import LongTermArchivePage from "./pages/LongTermArchive";
import PersonalChecklistPage from "./pages/PersonalChecklist";
import PersonalChecklistDetailPage from "./pages/PersonalChecklistDetail";
import AllChecklistsPage from "./pages/AllChecklists";
import ChecklistArchivePage from "./pages/ChecklistArchive";
import RandomChecklistPage from "./pages/RandomChecklist";
import RandomChecklistDetailPage from "./pages/RandomChecklistDetail";
import WheelPage from "./pages/Wheel";
import RewardsPage from "./pages/Rewards";
import SettingsPage from "./pages/Settings";
import MoneyPage from "./pages/Money";
import KitchenPage from "./pages/Kitchen";
import MealsPage from "./pages/Meals";
import GroceriesPage from "./pages/Groceries";
import DocumentsPage from "./pages/Documents";
import DailyHabitsPage from "./pages/DailyHabits";
import AuthPage from "./pages/auth/AuthPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <TooltipProvider>
        <Sonner richColors position="top-center" />
        <Toaster />
        <BrowserRouter>
          <AuthProvider>
            <PinGate>
              <div className="page-transition-root">
                <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/checklist" element={<ChecklistPage />} />
                <Route path="/checklist/long-term" element={<LongTermChecklistPage />} />
                <Route path="/checklist/long-term/archive" element={<LongTermArchivePage />} />
                <Route path="/checklist/personal" element={<PersonalChecklistPage />} />
                <Route path="/checklist/personal/:checklistId" element={<PersonalChecklistDetailPage />} />
                <Route path="/checklists" element={<AllChecklistsPage />} />
                <Route path="/checklist/archive" element={<ChecklistArchivePage />} />
                <Route path="/checklist/random" element={<RandomChecklistPage />} />
                <Route path="/checklist/random/:checklistId" element={<RandomChecklistDetailPage />} />
                <Route path="/wheel" element={<WheelPage />} />
                <Route path="/rewards" element={<RewardsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/money" element={<MoneyPage />} />
                <Route path="/kitchen" element={<KitchenPage />} />
                                <Route path="/meals" element={<MealsPage />} />
                                <Route path="/groceries" element={<GroceriesPage />} />
                                <Route path="/documents" element={<DocumentsPage />} />
                <Route path="/daily-habits/:userId" element={<DailyHabitsPage />} />
                <Route path="/auth/:path" element={<AuthPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </div>
            </PinGate>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;