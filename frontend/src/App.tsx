import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./app/Index";
import Members from "./app/admin/Members";
import Funds from "./app/admin/Funds";
import Contributions from "./app/admin/Contributions";
import Expenses from "./app/admin/Expenses";
import PublicPage from "./app/public/PublicPage";
import MemberPreview from "./app/public/MemberPreview";
import Reports from "./app/admin/Reports";
import Settings from "./app/admin/Settings";
import NotFound from "./app/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/members" element={<Members />} />
          <Route path="/funds" element={<Funds />} />
          <Route path="/contributions" element={<Contributions />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/public-page" element={<PublicPage />} />
          <Route path="/member-preview" element={<MemberPreview />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

