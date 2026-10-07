import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
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
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      // Constitution II: Toda comunicação IA passa pelo backend proxy
      const response = await api.post('/ia/chat', {
        query: userMessage,
        courseId: null,
      });

      setMessages(prev => [...prev, { role: 'ai', content: response.data.response }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'ai',
        content: 'O assistente inteligente está indisponível no momento. Por favor, tente novamente em alguns instantes.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Botão Flutuante */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Abrir assistente Trainify"
        className="fixed bottom-6 right-6 p-4 bg-primary-container text-white rounded-full shadow-lg hover:opacity-90 transition-opacity z-40"
      >
        <MessageSquare size={24} />
      </button>

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
                <p className="text-xs text-white/80">IA treinada no seu conteúdo</p>
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
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-primary-container text-white rounded-br-none' : 'bg-surface-container border border-outline-variant text-on-surface rounded-bl-none'}`}>
                    {msg.content}
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
