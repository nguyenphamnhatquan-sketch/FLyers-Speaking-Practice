/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Volume2, User, Bot, Loader2, Sparkles, X, RotateCcw, Smile, MessageCircle, FileText, Star, Trophy } from 'lucide-react';
import { GeminiLiveSession } from '../lib/gemini-live';
import { generateEvaluationReport, EvaluationReport } from '../lib/evaluator';

interface Message {
  text: string;
  role: 'user' | 'model';
}

export default function FlyersSession() {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [messages, setMessages] = useState<Message[]>([]);
  const [volume, setVolume] = useState(0);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string>("Zephyr");
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const sessionRef = useRef<GeminiLiveSession | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const topics = [
    { id: 'holidays', label: 'Holidays', icon: '✈️' },
    { id: 'hobbies', label: 'Hobbies', icon: '🎨' },
    { id: 'school', label: 'School Life', icon: '📚' },
    { id: 'friends', label: 'Friends', icon: '🤝' },
    { id: 'family', label: 'Family', icon: '🏠' },
  ];

  const voices = [
    { id: 'Zephyr', label: 'Zephyr', description: 'Friendly' },
    { id: 'Aoede', label: 'Aoede', description: 'Higher' },
    { id: 'Puck', label: 'Puck', description: 'Playful' },
    { id: 'Charon', label: 'Charon', description: 'Deep' },
  ];

  const apiKey = process.env.GEMINI_API_KEY;

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleSession = async () => {
    if (status === 'connected' || status === 'connecting') {
      sessionRef.current?.stop();
      setStatus('disconnected');
    } else {
      if (!apiKey) {
        setStatus('error');
        return;
      }
      
      const session = new GeminiLiveSession(apiKey, {
        topic: selectedTopic || undefined,
        voiceName: selectedVoice,
        playbackRate: playbackRate,
        onTranscription: (text, role) => {
           setMessages(prev => {
             if (prev.length > 0 && prev[prev.length - 1].role === role) {
               const last = prev[prev.length - 1];
               return [
                 ...prev.slice(0, -1),
                 { ...last, text: last.text + text }
               ];
             }
             return [...prev, { text, role }];
           });
        },
        onStatusChange: (newStatus) => {
          setStatus(newStatus);
          if (newStatus === 'disconnected') {
            setVolume(0);
            setIsBotSpeaking(false);
          }
        },
        onVolumeChange: (v) => {
          setVolume(v);
        },
        onSpeaking: (speaking) => {
          setIsBotSpeaking(speaking);
        }
      });
      
      sessionRef.current = session;
      try {
        await session.start();
      } catch (err) {
        console.error('Session start error:', err);
        setStatus('error');
      }
    }
  };

  const clearChat = () => {
    setMessages([]);
    setReport(null);
  };

  const handleGenerateReport = async () => {
    if (!apiKey || messages.length === 0) return;
    
    setIsGeneratingReport(true);
    setShowReportModal(true);
    try {
      const evaluation = await generateEvaluationReport(apiKey, messages);
      setReport(evaluation);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans text-slate-800 p-4 md:p-8 relative overflow-y-auto">
      {/* Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-red-100 flex flex-col"
            >
              <div className="bg-red-500 p-8 md:p-10 text-white text-center relative shrink-0">
                <button 
                  onClick={() => setShowReportModal(false)}
                  className="absolute top-6 right-6 p-2 lg:p-3 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 lg:w-8 lg:h-8" />
                </button>
                <div className="w-20 h-20 bg-white shadow-md rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-2">Practice Summary</h2>
                <p className="text-red-100 text-lg">Flyers Speaking Part 4</p>
              </div>

              <div className="p-8 md:p-10 flex-1">
                {isGeneratingReport ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-6">
                    <Loader2 className="w-14 h-14 animate-spin text-red-500" />
                    <p className="text-xl font-medium text-slate-500">Analyzing your answers...</p>
                  </div>
                ) : report ? (
                  <div className="space-y-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      {[
                        { label: 'Grammar', score: report.grammarScore },
                        { label: 'Vocab', score: report.vocabularyScore },
                        { label: 'Detail', score: report.interactionScore },
                        { label: 'Fluency', score: report.pronunciationScore },
                      ].map((stat) => (
                        <div key={stat.label} className="flex flex-col items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <div className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-3">{stat.label}</div>
                          <div className="flex gap-1 text-red-500">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-5 h-5 md:w-6 md:h-6 ${i < stat.score ? 'fill-current' : 'opacity-20'}`} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-red-50/50 p-6 rounded-2xl border border-red-50">
                      <h3 className="text-lg font-bold uppercase tracking-widest text-red-700 mb-4 flex items-center gap-2">
                        <MessageCircle className="w-5 h-5" /> Feedback
                      </h3>
                      <p className="text-slate-700 text-lg md:text-xl leading-relaxed italic">
                        "{report.overallFeedback}"
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold uppercase tracking-widest text-slate-700 mb-4 flex items-center gap-2">
                         <Sparkles className="w-5 h-5 text-red-500" /> Tips to Improve
                      </h3>
                      <ul className="space-y-4">
                        {report.tips.map((tip, i) => (
                          <li key={i} className="flex gap-4 text-base md:text-lg text-slate-600 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                            <div className="w-2 h-2 bg-red-500 rounded-full mt-2.5 shrink-0" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button 
                      onClick={() => setShowReportModal(false)}
                      className="w-full py-5 text-xl bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-colors shadow-lg active:scale-[0.98]"
                    >
                      Keep Practicing !
                    </button>
                  </div>
                ) : (
                  <p className="text-center text-slate-500 text-lg">Failed to load report.</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-200">
            <Volume2 className="text-white w-8 h-8" />
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-red-600">Flyers Buddy</h1>
            <p className="text-base md:text-lg text-slate-500 font-medium">Speaking Practice · Part 4</p>
          </div>
        </div>
        
        <div className="flex flex-wrap justify-center gap-3">
          {messages.length > 1 && (
             <button 
              onClick={handleGenerateReport}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white rounded-full border-2 border-red-100 hover:border-red-500 hover:bg-red-50 transition-all text-base font-bold text-red-600 shadow-sm"
            >
              <FileText className="w-5 h-5" />
              <span>Get Report</span>
            </button>
          )}
          {messages.length > 0 && (
            <button 
              onClick={clearChat}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-600 text-base font-bold shadow-sm"
              title="Clear transcript and report"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Interaction Area */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full">
        
        {/* Mascot & Controls */}
        <section className="w-full flex flex-col items-center bg-white rounded-[2.5rem] p-6 text-center md:p-10 shadow-xl shadow-slate-200/50 border-2 border-red-50">
           
          <div className="relative mb-8 mt-2">
            <motion.div 
              animate={status === 'connected' ? {
                scale: 1 + (volume * 0.4),
                y: isBotSpeaking ? [0, -8, 0] : 0,
                backgroundColor: isBotSpeaking ? '#ffed4a' : '#fee2e2', // yellow or light red
              } : {}}
              transition={{ 
                scale: { type: 'spring', stiffness: 300, damping: 20 },
                y: { repeat: isBotSpeaking ? Infinity : 0, duration: 1.5, ease: "easeInOut" },
                backgroundColor: { duration: 0.5 }
              }}
              className="w-40 h-40 md:w-56 md:h-56 rounded-full flex items-center justify-center relative overflow-hidden shadow-2xl bg-slate-100 border-8 border-white group transition-colors"
            >
              <AnimatePresence mode="wait">
                {isBotSpeaking ? (
                  <motion.div
                    key="speaking"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                  >
                    <Smile className="w-20 h-20 md:w-28 md:h-28 text-red-500" />
                  </motion.div>
                ) : status === 'connected' && volume > 0.1 ? (
                  <motion.div
                    key="listening"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1.1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                  >
                    <MessageCircle className="w-20 h-20 md:w-28 md:h-28 text-slate-600" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Bot className="w-20 h-20 md:w-28 md:h-28 text-slate-400 group-hover:text-red-400 transition-colors" />
                  </motion.div>
                )}
              </AnimatePresence>
              
              {status === 'connected' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 border-8 border-red-400 rounded-full animate-pulse opacity-30 pointer-events-none"
                />
              )}
            </motion.div>
            
            <AnimatePresence>
              {status === 'connected' && (
                <motion.div 
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute -top-2 -right-2 md:-top-4 md:-right-4 bg-yellow-400 p-3 md:p-4 rounded-full text-white shadow-xl rotate-12"
                >
                  <Sparkles className="w-6 h-6 md:w-8 md:h-8" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="w-full max-w-2xl px-4 flex flex-col items-center">
            <h2 className="text-2xl md:text-3xl font-extrabold mb-3 text-slate-800">
              {status === 'disconnected' && "Ready to talk?"}
              {status === 'connecting' && "Connecting to server..."}
              {status === 'connected' && "I'm listening to you!"}
              {status === 'error' && "Oops! Something went wrong."}
            </h2>
            <p className="text-base md:text-xl text-slate-500 mb-8 max-w-sm">
              {status === 'disconnected' && "Pick a topic you like and press the big microphone button to start!"}
              {status === 'connected' && "Just speak naturally like you are talking to a friend."}
              {status === 'error' && "Check your microphone permissions and try again."}
            </p>

            {status === 'disconnected' && (
              <div className="w-full space-y-8 max-w-xl mx-auto rounded-3xl bg-slate-50 p-6 md:p-8 border border-slate-100">
                <div>
                  <label className="text-sm md:text-base font-bold uppercase tracking-widest text-slate-500 block mb-4">
                    🗣️ Choose a Topic
                  </label>
                  <div className="flex flex-wrap justify-center gap-3">
                    {topics.map((topic) => (
                      <button
                        key={topic.id}
                        onClick={() => setSelectedTopic(selectedTopic === topic.id ? null : topic.id)}
                        className={`
                          px-4 py-3 md:px-6 md:py-4 rounded-2xl text-base md:text-lg font-bold transition-all border-2 
                          ${selectedTopic === topic.id 
                            ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-200 scale-105' 
                            : 'bg-white border-slate-200 text-slate-600 hover:border-red-300 hover:bg-red-50'}
                        `}
                      >
                        <span className="mr-2 text-xl md:text-2xl">{topic.icon}</span>
                        {topic.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <label className="text-sm md:text-base font-bold uppercase tracking-widest text-slate-500 block mb-4">
                    🎙️ Choose Buddy Voice
                  </label>
                  <div className="flex flex-wrap justify-center gap-3">
                    {voices.map((voice) => (
                      <button
                        key={voice.id}
                        onClick={() => setSelectedVoice(voice.id)}
                        className={`
                          px-5 py-3 rounded-2xl text-base font-bold transition-all border-2
                          ${selectedVoice === voice.id 
                            ? 'bg-slate-800 border-slate-800 text-white shadow-lg scale-105' 
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-800'}
                        `}
                      >
                        {voice.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <label className="text-sm md:text-base font-bold uppercase tracking-widest text-slate-500 block mb-4">
                    ⏱️ Voice Speed
                  </label>
                  <div className="flex flex-wrap justify-center gap-3">
                    {[
                      { id: 0.85, label: 'Slow', icon: '🐢' },
                      { id: 1.0, label: 'Normal', icon: '🙂' },
                      { id: 1.15, label: 'Fast', icon: '🐇' },
                    ].map((speed) => (
                      <button
                        key={speed.id}
                        onClick={() => {
                          setPlaybackRate(speed.id);
                          sessionRef.current?.setPlaybackRate(speed.id);
                        }}
                        className={`
                          px-5 py-3 rounded-2xl text-base font-bold transition-all border-2 flex items-center gap-2
                          ${playbackRate === speed.id 
                            ? 'bg-slate-800 border-slate-800 text-white shadow-lg scale-105' 
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-800'}
                        `}
                      >
                        <span className="text-xl">{speed.icon}</span> {speed.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            <button
              onClick={toggleSession}
              disabled={status === 'connecting'}
              className={`
                mt-10 px-10 py-6 md:px-14 md:py-8 rounded-full flex gap-4 items-center justify-center transition-all shadow-2xl active:scale-95
                ${status === 'connected' 
                  ? 'bg-slate-800 hover:bg-slate-900 border-4 border-slate-700 text-white' 
                  : 'bg-red-500 border-4 border-red-500 text-white hover:bg-red-600 hover:border-red-600 shadow-red-200'}
                ${status === 'connecting' ? 'opacity-70 cursor-wait' : ''}
              `}
            >
              {status === 'connecting' ? (
                <>
                  <Loader2 className="w-8 h-8 md:w-10 md:h-10 animate-spin" />
                  <span className="text-xl md:text-2xl font-bold">Connecting...</span>
                </>
              ) : status === 'connected' ? (
                <>
                  <MicOff className="w-8 h-8 md:w-10 md:h-10 text-red-400" />
                  <span className="text-xl md:text-2xl font-bold">Stop Talking</span>
                </>
              ) : (
                <>
                  <Mic className="w-8 h-8 md:w-10 md:h-10" />
                  <span className="text-xl md:text-2xl font-bold">Start Talking</span>
                </>
              )}
            </button>
          </div>
        </section>
      </main>

      {/* Footer Instructions */}
      <footer className="mt-8 text-center text-sm md:text-base text-slate-400 font-medium shrink-0">
        <p>💡 Tip: Relax and enjoy the conversation. The Buddy is here to help you learn!</p>
      </footer>
    </div>
  );
}

