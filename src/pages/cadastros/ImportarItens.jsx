import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import UploadStep from "@/components/cadastros/importar-itens/UploadStep";
import PreviewStep from "@/components/cadastros/importar-itens/PreviewStep";
import ResultadoStep from "@/components/cadastros/importar-itens/ResultadoStep";
import { montarPayload } from "@/lib/itens-import-service";

export default function ImportarItens() {
  const [step, setStep] = useState("upload"); // upload | preview | importing | resultado
  const [data, setData] = useState(null);
  const [duplicados, setDuplicados] = useState(new Set());
  const [resultado, setResultado] = useState(null);

  const handleParsed = async (parsed) => {
    setData(parsed);
    // Busca duplicados existentes (por id_externo e por nome normalizado)
    const [insumos, produtos] = await Promise.all([
      base44.entities.Insumo.list("-created_date", 5000),
      base44.entities.Produto.list("-created_date", 5000),
    ]);
    const dup = new Set();
    [...insumos, ...produtos].forEach((it) => {
      if (it.id_externo) dup.add(String(it.id_externo));
      if (it.nome) dup.add(`nome:${it.nome.toLowerCase().trim()}`);
    });
    setDuplicados(dup);
    setStep("preview");
  };

  const buscarExistente = async (linha) => {
    if (linha.id_externo) {
      const Entity = linha.entidade === "Produto" ? base44.entities.Produto : base44.entities.Insumo;
      const found = await Entity.filter({ id_externo: String(linha.id_externo) });
      if (found?.[0]) return { entity: Entity, record: found[0] };
    }
    // fallback por nome
    const Entity = linha.entidade === "Produto" ? base44.entities.Produto : base44.entities.Insumo;
    const found = await Entity.filter({ nome: linha.nome });
    if (found?.[0]) return { entity: Entity, record: found[0] };
    return null;
  };

  const handleConfirm = async ({ criarSaldoInicial, estrategiaDuplicado }) => {
    setStep("importing");
    const importacaoId = `imp_${Date.now()}`;
    const validas = data.linhas.filter((l) => l.valido);

    let criados = 0, atualizados = 0, ignorados = 0, erros = 0, saldoInicial = 0;
    const movs = [];
    const user = await base44.auth.me().catch(() => null);

    for (const linha of validas) {
      try {
        const Entity = linha.entidade === "Produto" ? base44.entities.Produto : base44.entities.Insumo;
        const payload = montarPayload(linha, importacaoId);

        const existente = await buscarExistente(linha);
        let registro;

        if (existente) {
          if (estrategiaDuplicado === "ignorar") {
            ignorados++;
            continue;
          }
          registro = await existente.entity.update(existente.record.id, payload);
          atualizados++;
        } else {
          registro = await Entity.create(payload);
          criados++;
        }

        if (criarSaldoInicial && linha.quantidade > 0) {
          movs.push({
            tipo: "entrada",
            item_tipo: linha.entidade === "Produto" ? "produto" : "insumo",
            item_id: registro.id,
            item_nome: linha.nome,
            quantidade: linha.quantidade,
            data: new Date().toISOString().slice(0, 10),
            motivo: "Saldo inicial (importação de planilha)",
            origem_tipo: "manual",
            origem_id: importacaoId,
            usuario_email: user?.email,
            // loja_id em branco = saldo geral; ajustável depois pelo usuário
            loja_id: "geral",
          });
        }
      } catch (e) {
        console.error("Erro importando linha", linha, e);
        erros++;
      }
    }

    if (movs.length > 0) {
      try {
        await base44.entities.MovimentacaoEstoque.bulkCreate(movs);
        saldoInicial = movs.length;
      } catch (e) {
        console.error("Erro criando saldo inicial", e);
      }
    }

    // Auditoria
    try {
      await base44.entities.LogAuditoria.create({
        data_hora: new Date().toISOString(),
        usuario_email: user?.email,
        usuario_nome: user?.full_name,
        origem: "humano",
        modulo: "cadastros",
        acao: "importar",
        entidade: "Insumo/Produto",
        descricao: `Importação de planilha: ${data.fileName}. Criados=${criados}, Atualizados=${atualizados}, Ignorados=${ignorados}, Erros=${erros}, Saldo inicial=${saldoInicial}.`,
        status: "sucesso",
        critico: false,
      });
    } catch (e) {
      console.error("Erro registrando auditoria", e);
    }

    setResultado({
      total: data.linhas.length,
      criados,
      atualizados,
      ignorados: ignorados + (data.linhas.length - validas.length),
      erros,
      saldoInicial,
    });
    setStep("resultado");
    toast.success(`Importação concluída: ${criados + atualizados} item(ns) processado(s).`);
  };

  const reiniciar = () => {
    setData(null);
    setResultado(null);
    setDuplicados(new Set());
    setStep("upload");
  };

  return (
    <div>
      <Link to="/cadastros" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="w-4 h-4 mr-1" /> Cadastros
      </Link>
      <PageHeader
        title="Importar Itens por Planilha"
        description="Importe insumos, embalagens, produtos de revenda e produtos acabados a partir de uma planilha XLSX/CSV."
      />

      {step === "upload" && <UploadStep onParsed={handleParsed} />}

      {step === "preview" && data && (
        <PreviewStep
          data={data}
          duplicados={duplicados}
          onBack={reiniciar}
          onConfirm={handleConfirm}
        />
      )}

      {step === "importing" && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileSpreadsheet className="w-10 h-10 text-muted-foreground animate-pulse mb-4" />
          <div className="font-medium">Importando itens...</div>
          <div className="text-sm text-muted-foreground">Não feche esta página.</div>
        </div>
      )}

      {step === "resultado" && resultado && (
        <ResultadoStep resultado={resultado} onReiniciar={reiniciar} />
      )}
    </div>
  );
}