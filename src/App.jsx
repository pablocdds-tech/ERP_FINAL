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
import FinanceiroIndex from '@/pages/financeiro/FinanceiroIndex';
import FinanceiroTipoPage from '@/pages/financeiro/FinanceiroTipoPage';
import RHIndex from '@/pages/rh/RHIndex';
import PessoasTipoPage from '@/pages/rh/PessoasTipoPage';
import RotinasIndex from '@/pages/rotinas/RotinasIndex';
import RotinasTipoPage from '@/pages/rotinas/RotinasTipoPage';
import MarketingIndex from '@/pages/marketing/MarketingIndex';
import MarketingTipoPage from '@/pages/marketing/MarketingTipoPage';
import AtendimentoIndex from '@/pages/atendimento/AtendimentoIndex';
import AtendimentoTipoPage from '@/pages/atendimento/AtendimentoTipoPage';
import GestaoIndex from '@/pages/gestao/GestaoIndex';
import GestaoTipoPage from '@/pages/gestao/GestaoTipoPage';
import IAIndex from '@/pages/ia/IAIndex';
import IATipoPage from '@/pages/ia/IATipoPage';
import Auditoria from '@/pages/Auditoria';
import PwaHome from '@/pages/pwa/PwaHome';
import PwaPonto from '@/pages/pwa/PwaPonto';
import PwaEscala from '@/pages/pwa/PwaEscala';
import PwaChecklist from '@/pages/pwa/PwaChecklist';
import PwaChamados from '@/pages/pwa/PwaChamados';
import PwaTarefas from '@/pages/pwa/PwaTarefas';
import PwaSolicitacoes from '@/pages/pwa/PwaSolicitacoes';
import PwaNotificacoes from '@/pages/pwa/PwaNotificacoes';
import PwaAprovacoes from '@/pages/pwa/PwaAprovacoes';
import PwaDashboard from '@/pages/pwa/PwaDashboard';
import PwaEquipe from '@/pages/pwa/PwaEquipe';

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
      {/* PWA Mobile (Funcionário + Gestor) */}
      <Route element={<PwaLayout />}>
        <Route path="/pwa" element={<PwaHome />} />
        <Route path="/pwa/ponto" element={<PwaPonto />} />
        <Route path="/pwa/escala" element={<PwaEscala />} />
        <Route path="/pwa/checklist" element={<PwaChecklist />} />
        <Route path="/pwa/chamados" element={<PwaChamados />} />
        <Route path="/pwa/tarefas" element={<PwaTarefas />} />
        <Route path="/pwa/solicitacoes" element={<PwaSolicitacoes />} />
        <Route path="/pwa/notificacoes" element={<PwaNotificacoes />} />
        <Route path="/pwa/aprovacoes" element={<PwaAprovacoes />} />
        <Route path="/pwa/dashboard" element={<PwaDashboard />} />
        <Route path="/pwa/equipe" element={<PwaEquipe />} />
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
        <Route path="/financeiro" element={<FinanceiroIndex />} />
        <Route path="/financeiro/:area/:tipo" element={<FinanceiroTipoPage />} />
        <Route path="/pessoas" element={<RHIndex />} />
        <Route path="/pessoas/:tipo" element={<PessoasTipoPage />} />
        <Route path="/rotinas" element={<RotinasIndex />} />
        <Route path="/rotinas/:tipo" element={<RotinasTipoPage />} />
        <Route path="/marketing" element={<MarketingIndex />} />
        <Route path="/marketing/:tipo" element={<MarketingTipoPage />} />
        <Route path="/atendimento" element={<AtendimentoIndex />} />
        <Route path="/atendimento/:tipo" element={<AtendimentoTipoPage />} />
        <Route path="/gestao" element={<GestaoIndex />} />
        <Route path="/gestao/:tipo" element={<GestaoTipoPage />} />
        <Route path="/ia" element={<IAIndex />} />
        <Route path="/ia/:tipo" element={<IATipoPage />} />
        <Route path="/auditoria" element={<Auditoria />} />
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