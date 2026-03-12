import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useState } from "react";
import { LogOut } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

// Pages
import CreateQuotation from "./pages/create-quotation";
import History from "./pages/history";
import EditQuotation from "./pages/edit-quotation";
import Login from "./pages/login";

function Router() {
  return (
    <Switch>
      <Route path="/" component={CreateQuotation} />
      <Route path="/history" component={History} />
      <Route path="/quotation/:id" component={EditQuotation} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem("aq_auth") === "true"
  );

  const handleLogin = () => setIsAuthenticated(true);

  const handleLogout = () => {
    localStorage.removeItem("aq_auth");
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Login onLogin={handleLogin} />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  const sidebarStyle = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div dir="rtl" className="text-right">
          <SidebarProvider style={sidebarStyle}>
            <div className="flex min-h-screen w-full bg-background overflow-hidden rtl-reverse">
              <AppSidebar />
              <div className="flex flex-col flex-1 w-full relative">
                {/* Header Navbar */}
                <header className="flex items-center justify-between p-4 border-b border-border/50 bg-card/50 backdrop-blur-md sticky top-0 z-40 no-print">
                  <div className="flex items-center gap-4">
                    <SidebarTrigger className="hover:bg-secondary p-2 rounded-xl transition-colors" />
                  </div>
                  <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                      title="تسجيل الخروج"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="hidden sm:block">خروج</span>
                    </button>
                  </div>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
