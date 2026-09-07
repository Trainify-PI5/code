import { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Sparkles,
  FileText,
  Eraser,
  ChevronLeft,
  MessageSquarePlus,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import api from "../services/api";
import { cn } from "../lib/utils";
import { useLanguage } from "../contexts/LanguageContext";

interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
}

export default function IAAssistant() {
  const { t } = useLanguage();
  // Mobile: sidebar de conversas fechada por padrão
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const recentConversations = [
    {
      id: "1",
      title: t("ia.conv1Title"),
      preview: t("ia.conv1Preview"),
      time: "10:42 AM",
    },
    {
      id: "2",
      title: t("ia.conv2Title"),
      preview: t("ia.conv2Preview"),
      time: t("ia.yesterday"),
    },
    {
      id: "3",
      title: t("ia.conv3Title"),
      preview: t("ia.conv3Preview"),
      time: "Out 12",
    },
  ];

  const suggestedActions = [
    { icon: FileText, label: t("ia.action1") },
    { icon: Sparkles, label: t("ia.action2") },
  ];

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "model",
      text: t("ia.welcomeMessage"),
      timestamp: "10:40 AM",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text: input,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await api.post("/chat", {
        message: input,
        courseId: selectedCourseId,
      });

      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: response.data.response,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: "O assistente inteligente está indisponível no momento. Por favor, tente novamente em alguns instantes.",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex-1 min-h-[500px] w-full flex bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm relative">
      {/* Overlay mobile quando sidebar aberta */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Barra Lateral de Conversas */}
      <aside
        className={cn(
          // Desktop: sempre visível como coluna fixa
          "lg:relative lg:translate-x-0 lg:w-80 lg:flex lg:flex-col lg:z-auto",
          // Mobile: drawer absoluto que desliza
          "absolute top-0 left-0 h-full w-[280px] z-30 flex flex-col transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          "border-r border-outline-variant bg-surface-bright/30",
        )}
      >
        <div className="p-4 sm:p-5 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
          <h2 className="text-lg sm:text-xl font-display font-bold">
            {t("ia.conversations")}
          </h2>
          <div className="flex items-center gap-1">
            <button className="p-2 hover:bg-surface-container rounded-lg transition-colors">
              <Eraser className="w-4 h-4 text-on-surface-variant" />
            </button>
            {/* Botão fechar — só mobile */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-surface-container rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-on-surface-variant" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-1">
            {t("ia.suggestedActions")}
          </span>
          <div className="space-y-2">
            {suggestedActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => setSidebarOpen(false)}
                className="w-full flex items-center gap-3 p-3 bg-surface-container-lowest border border-outline-variant rounded-xl hover:border-primary hover:shadow-sm transition-all group"
              >
                <action.icon className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-on-surface">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-5">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-4 py-4 block">
            {t("ia.recent")}
          </span>
          {recentConversations.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setSidebarOpen(false)}
              className="w-full text-left p-4 rounded-xl hover:bg-surface-container-lowest border border-transparent hover:border-outline-variant transition-all mb-1 group"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                  {chat.title}
                </span>
                <span className="text-[10px] text-on-surface-variant whitespace-nowrap ml-2">
                  {chat.time}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant truncate">
                {chat.preview}
              </p>
            </button>
          ))}
        </div>
      </aside>

      {/* Área do Chat */}
      <section className="flex-1 flex flex-col relative bg-surface-bright/20 min-w-0">
        {/* Header mobile com botão para abrir sidebar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-outline-variant bg-surface-container-lowest">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant"
          >
            <MessageSquarePlus className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-on-surface">
            {t("ia.assistantName") || "IA Assistant"}
          </span>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8"
        >
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-3 sm:gap-4 max-w-4xl",
                  msg.role === "user"
                    ? "flex-row-reverse self-end ml-auto"
                    : "self-start",
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                    msg.role === "model"
                      ? "bg-primary-container text-white"
                      : "bg-surface-container-lowest border border-outline-variant",
                  )}
                >
                  {msg.role === "model" ? (
                    <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-on-surface-variant" />
                  )}
                </div>
                <div
                  className={cn(
                    "flex flex-col gap-2 pt-1 min-w-0",
                    msg.role === "user" ? "items-end" : "items-start",
                  )}
                >
                  <span className="text-xs font-bold text-on-surface-variant">
                    {msg.role === "model" ? t("ia.assistantName") : t("ia.you")}
                  </span>
                  <div
                    className={cn(
                      "p-3 sm:p-5 rounded-2xl shadow-sm whitespace-pre-wrap break-words overflow-hidden leading-relaxed text-sm",
                      msg.role === "model"
                        ? "bg-surface-container-lowest border border-outline-variant text-on-surface rounded-tl-none"
                        : "bg-primary-container text-white rounded-tr-none max-w-[85vw] sm:max-w-md lg:max-w-2xl",
                    )}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-on-surface-variant">
                    {msg.timestamp}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <div className="flex gap-3 sm:gap-4 max-w-4xl self-start">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary-container text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl rounded-tl-none p-4 sm:p-5 flex gap-1 items-center">
                <div className="w-2 h-2 bg-on-surface-variant/30 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-2 h-2 bg-on-surface-variant/30 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-2 h-2 bg-on-surface-variant/30 rounded-full animate-bounce" />
              </div>
            </div>
          )}
        </div>

        {/* Área de Entrada */}
        <div className="p-3 sm:p-4 lg:p-6 bg-surface-container-lowest border-t border-outline-variant">
          <div className="max-w-4xl mx-auto">
            <div className="bg-surface-bright border border-outline-variant rounded-2xl focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all flex flex-col overflow-hidden">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  (e.preventDefault(), handleSend())
                }
                placeholder={t("ia.inputPlaceholder")}
                className="w-full border-none focus:ring-0 resize-none py-3 sm:py-4 px-4 sm:px-5 font-sans text-sm text-on-surface placeholder:text-outline bg-transparent min-h-[52px] sm:min-h-[60px]"
                rows={1}
              />
              <div className="flex justify-between items-center px-3 sm:px-4 py-2 sm:py-3 border-t border-outline-variant/30">
                <div />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="bg-primary-container text-white px-4 sm:px-5 py-2 rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  <span className="hidden sm:inline">{t("ia.send")}</span>
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-center text-[10px] text-on-surface-variant mt-2 sm:mt-3">
              {t("ia.disclaimer")}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
