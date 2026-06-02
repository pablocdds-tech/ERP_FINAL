import { Wand2, User } from "lucide-react";
import ReactMarkdown from "react-markdown";

// Bolha de conversa do Executor ERP. Usuário à direita, agente à esquerda.
// Suporta anexos (miniaturas de imagem) na mensagem do usuário.
export default function ExecutorBubble({ role, content, anexos = [], modelo }) {
  const isUser = role === "user";
  return (
    <div className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center mt-0.5 shrink-0">
          <Wand2 className="w-4 h-4 text-violet-600" />
        </div>
      )}
      <div className={`max-w-[82%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
        {anexos.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1.5 justify-end">
            {anexos.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer">
                <img src={url} alt="anexo" className="w-20 h-20 object-cover rounded-xl border border-border" />
              </a>
            ))}
          </div>
        )}
        {content && (
          <div
            className={`rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
              isUser
                ? "bg-violet-600 text-white rounded-br-sm"
                : "bg-card border border-border rounded-bl-sm"
            }`}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
            ) : (
              <ReactMarkdown
                className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                components={{
                  p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
                  li: ({ children }) => <li className="my-0.5">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                }}
              >
                {content}
              </ReactMarkdown>
            )}
          </div>
        )}
        {!isUser && modelo && (
          <div className="text-[10px] text-muted-foreground mt-1 px-1">via {modelo}</div>
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center mt-0.5 shrink-0">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}