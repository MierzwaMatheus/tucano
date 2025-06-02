import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ShoppingLists from "./pages/shopping/ShoppingLists";
import ShoppingListDetail from "./pages/shopping/ShoppingListDetail";
import Transactions from "./pages/finance/Transactions";
import Dashboard from "./pages/finance/Dashboard";
import Settings from "./pages/settings/Settings";
import Credit from './pages/finance/Credit';

// Create a QueryClient instance
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider>
          <Routes>
            {/* Rotas públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Rotas protegidas */}
            <Route path="/" element={<Navigate to="/finance/transactions" replace />} />
            <Route path="/shopping" element={
              <ProtectedRoute>
                <ShoppingLists />
              </ProtectedRoute>
            } />
            <Route path="/shopping/:id" element={
              <ProtectedRoute>
                <ShoppingListDetail />
              </ProtectedRoute>
            } />
            <Route path="/finance/transactions" element={
              <ProtectedRoute>
                <Transactions />
              </ProtectedRoute>
            } />
            <Route path="/finance/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/finance/card" element={<Credit />} />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            
            {/* Rota 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
          <Sonner />
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
