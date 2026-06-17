import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useParams, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import ErpLayout from '@/components/layout/ErpLayout';
import PwaLayout from '@/components/layout/PwaLayout';
import AdminGuard from '@/components/guards/AdminGuard';
import AppGuard from '@/components/guards/AppGuard';
import RootRedirect from '@/pages/RootRedirect';
import MesasLayout from '@/components/layout/MesasLayout';
import MesasHome from '@/pages/mesas/MesasHome';
import SelecionarGarcom from '@/pages/mesas/SelecionarGarcom';
import PainelMesas from '@/pages/mesas/PainelMesas';
import Comanda from '@/pages/mesas/Comanda';
import Produtos from '@/pages/mesas/Produtos';
import ConfigCardapio from '@/pages/mesas/ConfigCardapio';
import PdvPainel from '@/pages/pdv/PdvPainel';
import Roteirizacao from '@/pages/delivery/Roteirizacao';
import PdvIndex from '@/pages/pdv/PdvIndex';
import PdvTipoPage from '@/pages/pdv/PdvTipoPage';
import KdsTela from '@/pages/pdv/KdsTela';
import AutoCadastroFacial from '@/pages/AutoCadastroFacial';
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
import Aprovacoes from '@/pages/Aprovacoes';
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
import PwaPontosPendentes from '@/pages/pwa/PwaPontosPendentes';
import KioskGuard from '@/components/guards/KioskGuard';
import KioskLayout from '@/components/layout/KioskLayout';
import KioskHome from '@/pages/kiosk/KioskHome';
import KioskSetup from '@/pages/kiosk/KioskSetup';
import KioskLocked from '@/pages/kiosk/KioskLocked';

// Redireciona /pwa/algo → /app/algo (compatibilidade com links antigos)
const PwaCompatRedirect = () => {
  const { "*": rest } = useParams();
  return <Navigate to={`/app${rest ? `/${rest}` : ""}`} replace />;
};
// Redireciona rotas antigas do ERP (/cadastros, /financeiro, etc.) → /admin/...
const ErpCompatRedirect = () => {
  const location = useLocation();
  return <Navigate to={`/admin${location.pathname}${location.search}`} replace />;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Rota pública de autocadastro facial — acessível sem login (link enviado ao colaborador)
  if (window.location.pathname === "/cadastro-facial") {
    return <AutoCadastroFacial />;
  }

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
      {/* Raiz: redireciona conforme perfil */}
      <Route path="/" element={<RootRedirect />} />

      {/* PWA Kiosk (/kiosk) — tablet fixo na loja, sem login individual de funcionário */}
      <Route element={<KioskGuard />}>
        <Route element={<KioskLayout />}>
          <Route path="/kiosk" element={<KioskHome />} />
          <Route path="/kiosk/setup" element={<KioskSetup />} />
          <Route path="/kiosk/locked" element={<KioskLocked />} />
        </Route>
      </Route>

      {/* Compatibilidade: rota antiga do Kiosk dentro do /app */}
      <Route path="/app/kiosk-ponto" element={<Navigate to="/kiosk" replace />} />

      {/* PWA Mesas / Comandas (/mesas) — garçom no salão */}
      <Route element={<AppGuard />}>
        <Route element={<MesasLayout />}>
          <Route path="/mesas" element={<MesasHome />} />
          <Route path="/mesas/garcom" element={<SelecionarGarcom />} />
          <Route path="/mesas/painel" element={<PainelMesas />} />
          <Route path="/mesas/comanda/:comandaId" element={<Comanda />} />
          <Route path="/mesas/comanda/:comandaId/produtos" element={<Produtos />} />
          <Route path="/mesas/cardapio" element={<ConfigCardapio />} />
        </Route>
      </Route>

      {/* PWA Mobile (/app) — funcionário + gestor */}
      <Route element={<AppGuard />}>
        <Route element={<PwaLayout />}>
          <Route path="/app" element={<PwaHome />} />
          <Route path="/app/ponto" element={<PwaPonto />} />
          <Route path="/app/escala" element={<PwaEscala />} />
          <Route path="/app/checklist" element={<PwaChecklist />} />
          <Route path="/app/chamados" element={<PwaChamados />} />
          <Route path="/app/tarefas" element={<PwaTarefas />} />
          <Route path="/app/solicitacoes" element={<PwaSolicitacoes />} />
          <Route path="/app/notificacoes" element={<PwaNotificacoes />} />
          <Route path="/app/aprovacoes" element={<PwaAprovacoes />} />
          <Route path="/app/pontos-pendentes" element={<PwaPontosPendentes />} />
          <Route path="/app/dashboard" element={<PwaDashboard />} />
          <Route path="/app/equipe" element={<PwaEquipe />} />
        </Route>
      </Route>

      {/* KDS Cozinha — fullscreen, fora do ErpLayout */}
      <Route element={<AdminGuard />}>
        <Route path="/admin/kds" element={<KdsTela />} />
      </Route>

      {/* ERP Administrativo (/admin) — admin / gestor / operador */}
      <Route element={<AdminGuard />}>
        <Route element={<ErpLayout />}>
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/pdv" element={<PdvIndex />} />
          <Route path="/admin/pdv/painel" element={<PdvPainel />} />
          <Route path="/admin/pdv/:tipo" element={<PdvTipoPage />} />
          <Route path="/admin/roteirizacao" element={<Roteirizacao />} />
          <Route path="/admin/agentes" element={<Agentes />} />
          <Route path="/admin/cadastros" element={<CadastrosIndex />} />
          <Route path="/admin/cadastros/:tipo" element={<CadastroTipoPage />} />
          <Route path="/admin/operacoes" element={<OperacoesIndex />} />
          <Route path="/admin/operacoes/:tipo" element={<OperacaoTipoPage />} />
          <Route path="/admin/vendas" element={<VendasIndex />} />
          <Route path="/admin/vendas/:tipo" element={<VendaTipoPage />} />
          <Route path="/admin/financeiro" element={<FinanceiroIndex />} />
          <Route path="/admin/financeiro/:area/:tipo" element={<FinanceiroTipoPage />} />
          <Route path="/admin/pessoas" element={<RHIndex />} />
          <Route path="/admin/pessoas/:tipo" element={<PessoasTipoPage />} />
          <Route path="/admin/rotinas" element={<RotinasIndex />} />
          <Route path="/admin/rotinas/:tipo" element={<RotinasTipoPage />} />
          <Route path="/admin/marketing" element={<MarketingIndex />} />
          <Route path="/admin/marketing/:tipo" element={<MarketingTipoPage />} />
          <Route path="/admin/atendimento" element={<AtendimentoIndex />} />
          <Route path="/admin/atendimento/:tipo" element={<AtendimentoTipoPage />} />
          <Route path="/admin/gestao" element={<GestaoIndex />} />
          <Route path="/admin/gestao/:tipo" element={<GestaoTipoPage />} />
          <Route path="/admin/ia" element={<IAIndex />} />
          <Route path="/admin/ia/:tipo" element={<IATipoPage />} />
          <Route path="/admin/auditoria" element={<Auditoria />} />
          <Route path="/admin/aprovacoes" element={<Aprovacoes />} />
          <Route path="/admin/:moduleId" element={<ModulePage />} />
        </Route>
      </Route>

      {/* Compatibilidade com URLs antigas */}
      <Route path="/pwa" element={<Navigate to="/app" replace />} />
      <Route path="/pwa/*" element={<PwaCompatRedirect />} />
      <Route path="/cadastros/*" element={<ErpCompatRedirect />} />
      <Route path="/operacoes/*" element={<ErpCompatRedirect />} />
      <Route path="/vendas/*" element={<ErpCompatRedirect />} />
      <Route path="/financeiro/*" element={<ErpCompatRedirect />} />
      <Route path="/pessoas/*" element={<ErpCompatRedirect />} />
      <Route path="/rotinas/*" element={<ErpCompatRedirect />} />
      <Route path="/marketing/*" element={<ErpCompatRedirect />} />
      <Route path="/atendimento/*" element={<ErpCompatRedirect />} />
      <Route path="/gestao/*" element={<ErpCompatRedirect />} />
      <Route path="/ia/*" element={<ErpCompatRedirect />} />
      <Route path="/auditoria" element={<Navigate to="/admin/auditoria" replace />} />
      <Route path="/aprovacoes" element={<Navigate to="/admin/aprovacoes" replace />} />
      <Route path="/agentes" element={<Navigate to="/admin/agentes" replace />} />

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