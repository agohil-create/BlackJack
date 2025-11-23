
import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, ChevronLeft } from 'lucide-react';
import { sendChatMessage } from '../services/geminiService';

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'vic';
}

export const ChatWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { id: 0, sender: 'vic', text: "Welcome to the table. I'm Vic. Don't be shy, I don't bite... much." }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    // Auto-focus input when chat opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = { id: Date.now(), text: input, sender: 'user' };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const responseText = await sendChatMessage(input);
            const vicMsg: Message = { id: Date.now() + 1, text: responseText, sender: 'vic' };
            setMessages(prev => [...prev, vicMsg]);
        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { id: Date.now() + 1, text: "Lost connection to the dealer...", sender: 'vic' }]);
        } finally {
            setIsTyping(false);
            // Re-focus input after sending
            setTimeout(() => inputRef.current?.focus(), 10);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSend();
    };

    // Minimized State (Button)
    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed left-0 top-1/2 -translate-y-1/2 z-[100] bg-black/60 backdrop-blur-md border-r border-t border-b border-gold-500/50 text-gold-400 p-3 rounded-r-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:bg-black/80 hover:w-16 transition-all duration-300 group flex items-center gap-2 overflow-hidden w-12"
            >
                <MessageSquare className="w-6 h-6 flex-shrink-0" />
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-bold tracking-widest text-xs whitespace-nowrap">CHAT</span>
            </button>
        );
    }

    // Expanded State (Sidebar)
    return (
        <div className="fixed left-0 top-0 bottom-0 w-80 z-[100] bg-stone-950/95 backdrop-blur-xl border-r border-white/10 shadow-[5px_0_50px_rgba(0,0,0,0.8)] flex flex-col animate-slide-right">
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-white/5 bg-black/20 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse"></div>
                    <span className="font-playfair font-bold text-gold-400 tracking-wider">VIC</span>
                </div>
                <button 
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.map((msg) => (
                    <div 
                        key={msg.id} 
                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div 
                            className={`
                                max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm
                                ${msg.sender === 'user' 
                                    ? 'bg-blue-900/60 border border-blue-500/30 text-blue-50 rounded-tr-sm backdrop-blur-sm' 
                                    : 'bg-white/10 border border-white/5 text-gray-200 rounded-tl-sm backdrop-blur-sm'}
                            `}
                        >
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start animate-pulse">
                        <div className="bg-white/5 border border-white/5 px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1 items-center">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/5 bg-black/40 shrink-0">
                <div className="relative flex items-center">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Say something..."
                        className="w-full bg-black/60 border border-white/10 rounded-full py-3 pl-4 pr-12 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/50 transition-all shadow-inner"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        className="absolute right-2 p-2 bg-gold-600 hover:bg-gold-500 text-black rounded-full disabled:opacity-50 disabled:hover:bg-gold-600 transition-colors shadow-lg"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
            
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
                @keyframes slideRight {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(0); }
                }
                .animate-slide-right {
                    animation: slideRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
            `}</style>
        </div>
    );
};
