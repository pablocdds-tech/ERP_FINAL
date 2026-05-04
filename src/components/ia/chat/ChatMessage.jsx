import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function ChatMessage({ role, content, modelo }) {
  const isUser = role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-primary/5 flex items-center justify-center mt-0.5 shrink-0">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      )}
      <div className={`max-w-[85%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm ${
            isUser ? "bg-foreground text-background" : "bg-card border border-border"
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
                ol: ({ children }) => <ol className="my-1 ml-4 list-decimal">{children}</ol>,
                li: ({ children }) => <li className="my-0.5">{children}</li>,
                code: ({ inline, children }) =>
                  inline ? (
                    <code className="px-1 py-0.5 rounded bg-muted text-xs">{children}</code>
                  ) : (
                    <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                      <code>{children}</code>
                    </pre>
                  ),
              }}
            >
              {content}
            </ReactMarkdown>
          )}
        </div>
        {!isUser && modelo && (
          <div className="text-[10px] text-muted-foreground mt-1 px-1">via {modelo}</div>
        )}
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-lg bg-foreground/10 flex items-center justify-center mt-0.5 shrink-0">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}