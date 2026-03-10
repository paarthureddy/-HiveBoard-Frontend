import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, X, Send, Sparkles } from "lucide-react";
import { ChatMessage, StickyNote, TextItem } from "@/types/canvas";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AiChatPanelProps {
    isOpen: boolean;
    onToggle: () => void;
    stickyNotes?: StickyNote[];
    textItems?: TextItem[];
}

// Gemini API config — reads from VITE_GEMINI_API_KEY in .env
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const GEMINI_API_URL =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// Conversation history type for multi-turn chat
interface GeminiPart { text: string }
interface GeminiMessage { role: 'user' | 'model'; parts: GeminiPart[] }

const SYSTEM_PROMPT = `You are StyleAI, a professional AI Fashion Assistant for an online fashion platform.

Your role is to help users choose outfits, match clothing items, and improve their fashion sense. Always respond in a friendly, stylish, and helpful tone.

Capabilities:
1. Recommend outfits based on occasion (casual, party, office, wedding, travel, etc.).
2. Suggest color combinations that match well.
3. Give fashion advice based on trends, seasons, and comfort.
4. Help users style items they already have (e.g., "How to style a white shirt?").
5. Recommend accessories like watches, shoes, bags, or sunglasses that complement the outfit.
6. Suggest outfits based on gender, body type, and personal style if the user provides it.
7. Provide quick and practical styling tips.

Rules:
- Keep answers short, clear, and stylish.
- Use bullet points when suggesting outfits.
- Focus only on fashion, styling, clothing, accessories, and trends.
- If the user asks something unrelated to fashion, politely guide the conversation back to fashion topics.
- Be positive and encouraging about personal style.
- Do NOT generate or attempt to generate images — only produce text responses.

Always aim to make the user look confident, stylish, and comfortable.`;

const BOT_NAME = 'StyleAI';

const INITIAL_MESSAGE: ChatMessage = {
    id: 'welcome',
    userId: 'ai',
    userName: BOT_NAME,
    content: '👗 Hey there! I\'m **StyleAI**, your personal AI fashion assistant!\n\nI can help you with:\n- **Outfit ideas** for any occasion\n- **Color matching** tips\n- **Accessory** recommendations\n- **Styling** items you already own\n\nWhat are you looking to wear today?',
    timestamp: new Date()
};

/**
 * AI Chat Panel
 *
 * Calls Google Gemini 1.5 Flash directly from the browser.
 * No backend required — just set VITE_GEMINI_API_KEY in your .env file.
 * Supports multi-turn conversation and board context awareness.
 */
const AiChatPanel = ({
    isOpen,
    onToggle,
    stickyNotes = [],
    textItems = []
}: AiChatPanelProps) => {
    const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
    const [conversationHistory, setConversationHistory] = useState<GeminiMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    /** Build a context string from the current board state */
    const buildBoardContext = (): string => {
        const parts: string[] = [];
        if (stickyNotes.length > 0) {
            parts.push('**Current sticky notes on the board:**');
            stickyNotes.forEach((n, i) => {
                if (n.text?.trim()) parts.push(`${i + 1}. "${n.text.trim()}"`);
            });
        }
        if (textItems.length > 0) {
            parts.push('**Text items on the board:**');
            textItems.forEach((t, i) => {
                if (t.text?.trim()) parts.push(`${i + 1}. "${t.text.trim()}"`);
            });
        }
        return parts.length > 0
            ? `\n\n[Board Context]\n${parts.join('\n')}\n`
            : '';
    };

    const handleSendMessage = async (content: string) => {
        if (!GEMINI_API_KEY) {
            const errMsg: ChatMessage = {
                id: crypto.randomUUID(),
                userId: 'ai',
                userName: 'HiveMind',
                content: '⚠️ **Setup required:** Add your Gemini API key to the `.env` file:\n```\nVITE_GEMINI_API_KEY=your_key_here\n```\nGet a free key at [aistudio.google.com](https://aistudio.google.com/app/apikey)',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errMsg]);
            return;
        }

        // Add user message to UI
        const userMessage: ChatMessage = {
            id: crypto.randomUUID(),
            userId: 'user',
            userName: 'You',
            content,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsTyping(true);

        // Build the user turn — include board context on first message or if board has content
        const boardContext = buildBoardContext();
        const userText = boardContext ? `${content}${boardContext}` : content;

        // Append to conversation history
        const newUserTurn: GeminiMessage = { role: 'user', parts: [{ text: userText }] };
        const updatedHistory = [...conversationHistory, newUserTurn];

        try {
            const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
                    contents: updatedHistory,
                    generationConfig: {
                        temperature: 0.8,
                        maxOutputTokens: 1024,
                    },
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                const errDetail = data?.error?.message || `HTTP ${response.status}`;
                throw new Error(errDetail);
            }

            const aiText: string =
                data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response received.';

            // Save model reply to conversation history for multi-turn
            const modelTurn: GeminiMessage = { role: 'model', parts: [{ text: aiText }] };
            setConversationHistory([...updatedHistory, modelTurn]);

            const aiResponse: ChatMessage = {
                id: crypto.randomUUID(),
                userId: 'ai',
                userName: BOT_NAME,
                content: aiText,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, aiResponse]);

        } catch (error: any) {
            console.error('Gemini API error:', error);
            const errorResponse: ChatMessage = {
                id: crypto.randomUUID(),
                userId: 'ai',
                userName: BOT_NAME,
                content: `⚠️ ${error?.message || "Something went wrong. Please check your API key and try again."}`,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorResponse]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim()) {
            handleSendMessage(inputValue.trim());
        }
    };

    return (
        <>
            {/* Toggle Button */}
            <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                onClick={onToggle}
                className="fixed bottom-24 md:bottom-6 right-4 md:right-6 w-12 h-12 md:w-14 md:h-14 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-elevated hover:shadow-glow transition-all hover:scale-105 z-40"
            >
                {isOpen ? (
                    <X className="w-5 h-5" />
                ) : (
                    <Bot className="w-6 h-6" />
                )}
            </motion.button>

            {/* Chat Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: 300 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 300 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed md:right-6 md:bottom-24 md:w-80 md:h-[500px] md:rounded-2xl inset-0 w-full h-full md:inset-auto bg-card border border-border flex flex-col overflow-hidden z-[60]"
                    >
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-violet-50 dark:bg-violet-900/10">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                                    <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                </div>
                                <div>
                                    <h3 className="font-display font-semibold">{BOT_NAME}</h3>
                                    <p className="text-xs text-muted-foreground">AI Fashion Assistant</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="md:hidden" onClick={onToggle}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-elegant">
                            {messages.map((message) => {
                                const isAi = message.userId === 'ai';
                                return (
                                    <motion.div
                                        key={message.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`flex gap-3 ${!isAi ? 'flex-row-reverse' : ''}`}
                                    >
                                        <div
                                            className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-medium ${isAi ? 'bg-violet-100 text-violet-600' : 'bg-primary/10 text-primary'
                                                }`}
                                        >
                                            {isAi ? <Bot className="w-4 h-4" /> : 'Y'}
                                        </div>
                                        <div className={`max-w-[85%] ${!isAi ? 'text-right' : ''}`}>
                                            <div className="flex items-baseline gap-2 mb-1">
                                                <span className="text-xs font-medium">{message.userName}</span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {new Date(message.timestamp).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </span>
                                            </div>
                                            <div
                                                className={`px-3 py-2 rounded-xl text-sm ${!isAi
                                                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                                                    : 'bg-muted rounded-bl-sm prose prose-sm dark:prose-invert max-w-none'
                                                    }`}
                                            >
                                                {isAi ? (
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                        {message.content}
                                                    </ReactMarkdown>
                                                ) : (
                                                    <span>{message.content}</span>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}

                            {isTyping && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex gap-3"
                                >
                                    <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex-shrink-0 flex items-center justify-center">
                                        <Bot className="w-4 h-4" />
                                    </div>
                                    <div className="bg-muted px-3 py-2 rounded-xl rounded-bl-sm flex items-center gap-1 h-9">
                                        <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                        <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" />
                                    </div>
                                </motion.div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSubmit} className="p-3 border-t border-border">
                            <div className="flex gap-2">
                                <Input
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Ask about outfits, colors, styling..."
                                    className="flex-1 bg-muted border-0 focus-visible:ring-1"
                                    disabled={isTyping}
                                />
                                <Button
                                    type="submit"
                                    size="icon"
                                    disabled={!inputValue.trim() || isTyping}
                                    className="bg-violet-600 hover:bg-violet-700"
                                >
                                    <Send className="w-4 h-4" />
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default AiChatPanel;
