
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import ProtectedRoute from "@/components/ProtectedRoute"; // Import ProtectedRoute
import Layout from "@/components/Layout"; // Import Layout
import Index from "./pages/Index";
import Welcome from "./pages/Welcome";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import ImageViewer from "./pages/ImageViewer";
import VoiceMessagePlayer from "./pages/VoiceMessagePlayer";

const queryClient = new QueryClient();


const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route 
            path="/chat" 
            element={<ProtectedRoute element={<Layout><Index /></Layout>} />}
          />
          <Route 
            path="/settings" 
            element={<ProtectedRoute element={<Layout><Settings /></Layout>} />}
          />
          <Route path="/image-viewer" element={<ImageViewer />} />
          <Route path="/voice-player" element={<VoiceMessagePlayer />} />
          <Route path="/" element={<Welcome />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
