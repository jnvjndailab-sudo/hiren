import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, FileText, Image as ImageIcon, Loader2, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { sendMessage, Message } from '../services/gemini';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: "Hello! I'm JNV Junagadh AI. How can I help you today, fellow Navodayan?",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<Array<{ file: File; base64: string; type: string; name: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const SUPPORTED_MIME_TYPES = [
    'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif',
    'application/pdf',
    'text/plain', 'text/csv', 'text/html', 'text/css', 'text/md', 'text/rtf', 'text/xml',
    'application/json',
    'video/mp4', 'video/mpeg', 'video/quicktime', 'video/avi', 'video/x-flv', 'video/mpg', 'video/webm', 'video/wmv', 'video/3gpp',
    'audio/wav', 'audio/mp3', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/flac'
  ];

  const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB limit for inlineData

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      // Check size
      if (file.size > MAX_FILE_SIZE) {
        alert(`File too large: ${file.name}. Maximum size is 15MB.`);
        continue;
      }

      // Check MIME type
      if (!SUPPORTED_MIME_TYPES.includes(file.type) && !file.type.startsWith('image/') && !file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
        alert(`Unsupported file type: ${file.name}. Please upload images, PDFs, or text files.`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        setAttachments((prev) => [
          ...prev,
          {
            file,
            base64,
            type: file.type,
            name: file.name,
          },
        ]);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      text: input,
      files: attachments.map(a => ({
        mimeType: a.type,
        data: a.base64,
        name: a.name
      }))
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    try {
      const response = await sendMessage(
        messages,
        input,
        userMessage.files
      );

      const modelMessage: Message = {
        role: 'model',
        text: response.text || "I'm sorry, I couldn't generate a response.",
        groundingMetadata: response.candidates?.[0]?.groundingMetadata
      };

      setMessages((prev) => [...prev, modelMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'model', text: 'Sorry, I encountered an error. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={cn(
              "flex flex-col max-w-[85%]",
              msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
            )}
          >
            {/* User Files Preview in Message */}
            {msg.files && msg.files.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 justify-end">
                {msg.files.map((f, i) => (
                  <div key={i} className="bg-slate-100 rounded-lg p-2 flex items-center gap-2 border border-slate-200">
                    {f.mimeType.startsWith('image/') ? (
                      <img src={`data:${f.mimeType};base64,${f.data}`} className="w-12 h-12 object-cover rounded" alt="upload" />
                    ) : (
                      <FileText className="w-6 h-6 text-slate-500" />
                    )}
                    <span className="text-xs text-slate-600 truncate max-w-[100px]">{f.name}</span>
                  </div>
                ))}
              </div>
            )}

            <div
              className={cn(
                "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                msg.role === 'user'
                  ? "bg-indigo-600 text-white rounded-tr-none shadow-md"
                  : "bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200"
              )}
            >
              <div className="prose prose-sm max-w-none prose-slate dark:prose-invert">
                <Markdown>{msg.text}</Markdown>
              </div>

              {/* Grounding Metadata (Sources) */}
              {msg.groundingMetadata?.groundingChunks && (
                <div className="mt-4 pt-3 border-t border-slate-200/50">
                  <div className="flex items-center gap-1.5 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <Globe className="w-3 h-3" />
                    Sources
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {msg.groundingMetadata.groundingChunks.map((chunk: any, i: number) => (
                      chunk.web && (
                        <a
                          key={i}
                          href={chunk.web.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] bg-white/50 hover:bg-white px-2 py-1 rounded border border-slate-200 text-indigo-600 font-medium transition-colors truncate max-w-[200px]"
                        >
                          {chunk.web.title || chunk.web.uri}
                        </a>
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-slate-400 text-sm animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin" />
            JNV AI is thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100">
        {/* Attachment Previews */}
        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex flex-wrap gap-2 mb-3"
            >
              {attachments.map((att, i) => (
                <div key={i} className="relative group">
                  <div className="bg-slate-50 rounded-xl p-2 border border-slate-200 flex items-center gap-2 pr-8">
                    {att.type.startsWith('image/') ? (
                      <img src={`data:${att.type};base64,${att.base64}`} className="w-8 h-8 object-cover rounded" alt="preview" />
                    ) : (
                      <FileText className="w-6 h-6 text-slate-400" />
                    )}
                    <span className="text-xs text-slate-600 truncate max-w-[120px]">{att.name}</span>
                  </div>
                  <button
                    onClick={() => removeAttachment(i)}
                    className="absolute -top-1 -right-1 bg-white border border-slate-200 rounded-full p-0.5 text-slate-400 hover:text-red-500 shadow-sm transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
            title="Upload files or images"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            multiple
            accept="image/*,application/pdf,text/*,video/*,audio/*"
          />
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask anything about JNV Junagadh..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={(!input.trim() && attachments.length === 0) || isLoading}
            className={cn(
              "p-2.5 rounded-xl transition-all shadow-sm",
              (!input.trim() && attachments.length === 0) || isLoading
                ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                : "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95"
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
