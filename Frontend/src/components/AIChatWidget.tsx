import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { montarHistorico, perguntarAssistente, type FonteIa } from '../lib/iaChat';
import MarkdownText from './MarkdownText';

interface MensagemWidget {
  role: 'user' | 'ai';
  content: string;
  sources?: FonteIa[];
  /** avisos de erro nao entram no historico enviado a IA */
  erro?: boolean;
}

export default function AIChatWidget() {
  const bounds = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; left: number; top: number } | null>(null);
  const moved = useRef(false);
  const [position, setPosition] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('trainify.assistant.position') ?? 'null');
      if ([saved?.x, saved?.y].every(n => Number.isFinite(n) && n >= 0 && n <= 1)) {
        return { x: Number(saved.x), y: Number(saved.y) };
      }
    } catch { /* Storage may be unavailable in private browsing. */ }
    return { x: 1, y: 0.65 };
  });
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<MensagemWidget[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || !user) return;

    const userMessage = input.trim();
    const historico = montarHistorico(
      messages.map((m) => ({ role: m.role, text: m.content, historico: !m.erro })),
    );
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      // Toda comunicação com a IA passa pelo backend, que decide o que o usuário pode consultar
      const resposta = await perguntarAssistente(userMessage, historico);
      setMessages(prev => [...prev, { role: 'ai', content: resposta.response, sources: resposta.sources }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'ai',
        erro: true,
        content: 'O assistente inteligente está indisponível no momento. Por favor, tente novamente em alguns instantes.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="pointer-events-none fixed z-40 top-[max(0.75rem,env(safe-area-inset-top))] left-[max(0.75rem,env(safe-area-inset-left))] right-[max(0.75rem,env(safe-area-inset-right))] bottom-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div ref={bounds} className="absolute inset-0 right-12 bottom-12">
      <button
        type="button"
        style={{ left: position.x * 100 + '%', top: position.y * 100 + '%' }}
        onPointerDown={event => {
          if (!event.isPrimary || event.button !== 0) return;
          const rect = event.currentTarget.getBoundingClientRect();
          drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
          moved.current = false;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={event => {
          const start = drag.current;
          if (!start || start.id !== event.pointerId || !bounds.current) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (!moved.current && Math.hypot(dx, dy) < 6) return;
          moved.current = true;
          const area = bounds.current.getBoundingClientRect();
          const fraction = (offset: number, size: number) => Math.max(0, Math.min(1, offset / Math.max(size, 1)));
          setPosition({ x: fraction(start.left + dx - area.left, area.width), y: fraction(start.top + dy - area.top, area.height) });
        }}
        onPointerUp={event => {
          if (drag.current?.id !== event.pointerId) return;
          drag.current = null;
          if (moved.current) {
            try { localStorage.setItem('trainify.assistant.position', JSON.stringify(position)); } catch { /* Keep the position for this session. */ }
          }
        }}
        onLostPointerCapture={() => { drag.current = null; }}
        onClick={event => {
          if (!moved.current || event.detail === 0) setIsOpen(true);
          moved.current = false;
        }}
        title="Toque para abrir ou arraste para mover"
        aria-label="Abrir assistente Trainify"
        className="pointer-events-auto absolute grid h-12 w-12 touch-none select-none cursor-grab place-items-center rounded-full bg-primary-container text-white shadow-lg hover:opacity-90 active:cursor-grabbing"
      >
        <MessageSquare size={24} />
      </button>
      </div>
      </div>

      {/* Modal do Chat */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            role="dialog"
            aria-label="Assistente Trainify"
            className="fixed bottom-24 right-4 sm:right-6 w-[calc(100%-2rem)] max-w-96 h-[500px] max-h-[calc(100dvh-7rem)] bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant flex flex-col z-50 overflow-hidden"
          >
            {/* Cabecalho: primary-container e nao primary, porque no tema escuro
                --primary e um lilas claro e o texto branco some em cima dele. */}
            <div className="p-4 bg-primary-container text-white flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Assistente Trainify</h3>
                <p className="text-xs text-white/80">Responde com base no material dos seus cursos</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Fechar assistente"
                className="hover:bg-white/20 p-1 rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-bright">
              {messages.length === 0 && (
                <div className="text-center text-on-surface-variant text-sm mt-10">
                  Olá! Como posso ajudar você no seu aprendizado hoje?
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm min-w-0 ${msg.role === 'user' ? 'bg-primary-container text-white rounded-br-none whitespace-pre-wrap break-words' : 'bg-surface-container border border-outline-variant text-on-surface rounded-bl-none'}`}>
                    {msg.role === 'ai' ? <MarkdownText text={msg.content} sources={msg.sources} /> : msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-surface-container border border-outline-variant p-3 rounded-2xl rounded-bl-none">
                    <Loader2 className="animate-spin text-primary" size={16} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Entrada */}
            <div className="p-4 border-t border-outline-variant bg-surface-container-lowest">
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pergunte sobre um curso..."
                  aria-label="Pergunte sobre um curso"
                  className="flex-1 bg-surface-container border border-outline-variant rounded-xl px-4 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  aria-label="Enviar pergunta"
                  className="bg-primary-container text-white p-2 rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
