import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import ErpLayout from '@/components/layout/ErpLayout';
import PwaLayout from '@/components/layout/PwaLayout';
import Dashboard from '@/pages/Dashboard';
import ModulePage from '@/pages/modules/ModulePage';
import Agentes from '@/pages/Agentes';
import CadastrosIndex from '@/pages/cadastros/CadastrosIndex';
import CadastroTipoPage from '@/pages/cadastros/CadastroTipoPage';
import OperacoesIndex from '@/pages/operacoes/OperacoesIndex';
import OperacaoTipoPage from '@/pages/operacoes/OperacaoTipoPage';
import VendasIndex from '@/pages/vendas/VendasIndex';
import VendaTipoPage from '@/pages/vendas/VendaTipoPage';
import PwaHome from '@/pages/pwa/PwaHome';
import PwaPonto from '@/pages/pwa/PwaPonto';
import PwaEscala from '@/pages/pwa/PwaEscala';
import PwaChecklist from '@/pages/pwa/PwaChecklist';
import PwaChamados from '@/pages/pwa/PwaChamados';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      {/* PWA do Funcionário */}
      <Route element={<PwaLayout />}>
        <Route path="/pwa" element={<PwaHome />} />
        <Route path="/pwa/ponto" element={<PwaPonto />} />
        <Route path="/pwa/escala" element={<PwaEscala />} />
        <Route path="/pwa/checklist" element={<PwaChecklist />} />
        <Route path="/pwa/chamados" element={<PwaChamados />} />
      </Route>

      {/* ERP Administrativo */}
      <Route element={<ErpLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/agentes" element={<Agentes />} />
        <Route path="/cadastros" element={<CadastrosIndex />} />
        <Route path="/cadastros/:tipo" element={<CadastroTipoPage />} />
        <Route path="/operacoes" element={<OperacoesIndex />} />
        <Route path="/operacoes/:tipo" element={<OperacaoTipoPage />} />
        <Route path="/vendas" element={<VendasIndex />} />
        <Route path="/vendas/:tipo" element={<VendaTipoPage />} />
        <Route path="/:moduleId" element={<ModulePage />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App