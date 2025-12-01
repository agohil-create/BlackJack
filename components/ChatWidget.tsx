
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
        { id: 0, sender: 'vic', text: "Welcome to Khel.fun. Ready to win?" }
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
            setTimeout(() => inputRef.current?.focus(), 10);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSend();
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed left-0 top-1/2 -translate-y-1/2 z-[100] bg-[#1a1a1a] border-r border-t border-b border-white/10 text-white p-3 rounded-r-xl shadow-md hover:bg-[#222] hover:w-16 transition-all duration-300 group flex items-center gap-2 overflow-hidden w-12"
            >
                <MessageSquare className="w-6 h-6 flex-shrink-0" />
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-anton tracking-widest text-xs whitespace-nowrap">CHAT</span>
            </button>
        );
    }

    return (
        <div className="fixed left-0 top-0 bottom-0 w-80 z-[100] bg-[#1a1a1a] border-r border-white/10 shadow-2xl flex flex-col animate-slide-right font-sans">
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-white/5 bg-[#222] shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-khel-cyan"></div>
                    <span className="font-anton font-bold text-white tracking-wider text-xl">VIC</span>
                </div>
                <button 
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#1a1a1a]">
                {messages.map((msg) => (
                    <div 
                        key={msg.id} 
                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div 
                            className={`
                                max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm
                                ${msg.sender === 'user' 
                                    ? 'bg-[#001F3F] text-white rounded-tr-sm' 
                                    : 'bg-[#262626] text-gray-200 rounded-tl-sm'}
                            `}
                        >
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start animate-pulse">
                        <div className="bg-[#262626] px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1 items-center">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/5 bg-[#222] shrink-0">
                <div className="relative flex items-center">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Say something..."
                        className="w-full bg-[#111] border border-white/10 rounded-full py-3 pl-4 pr-12 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition-all shadow-inner"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        className="absolute right-2 p-2 bg-khel-cyan hover:bg-cyan-400 text-black rounded-full disabled:opacity-50 disabled:hover:bg-khel-cyan transition-colors shadow-sm"
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