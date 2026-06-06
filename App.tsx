
import React, { useState, useRef, useEffect } from 'react';
import { Message, Sender, Language, NavMenuOption, HealthAnalysis } from './types';
import { DOXA_AI_NAV_MENU } from './constants';
import { sendMessage, analyzeHealthTopic } from './geminiService';
import Header from './components/Header';
import ChatBubble from './components/ChatBubble';
import HomePage from './components/HomePage';
import HealthCheckView from './components/HealthCheckView';
import HealthResultView from './components/HealthResultView';
import ClinicView from './components/ClinicView';
import MentalHealthView from './components/MentalHealthView';
import HealthReportView from './components/HealthReportView';
import MaternalCareView from './components/MaternalCareView';
import DisclaimerModal from './components/DisclaimerModal';
import CaseVaultView from './components/CaseVaultView';

import { auth } from './firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { createOrUpdateConversation, saveMessageToDb, fetchConversationMessages } from './firebaseService';
import AuthView from './components/AuthView';
import MedicationsView from './components/MedicationsView';
import BookingsView from './components/BookingsView';
import ChatsListView from './components/ChatsListView';

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'chat' | 'health-check' | 'health-result' | 'clinic-finder' | 'mental-health' | 'health-report' | 'maternal-care' | 'case-vault' | 'login' | 'medications' | 'bookings' | 'chats'>('home');
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState<boolean>(() => {
    return localStorage.getItem('doxacare_accepted_v1') === 'true';
  });
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: Sender.AI,
      text: "Welcome to DoxaCare — Your trusted health assistant for Sierra Leone. How can I help you today? \n\n1. Health Check\n2. Find Nearby Clinic/Pharmacy\n3. Health Report\n4. Mental Health & Drug Abuse\n5. Maternal & Child Care\n6. Emergency Help",
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<Language>(Language.ENGLISH);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | undefined>(undefined);
  const [currentAnalysis, setCurrentAnalysis] = useState<HealthAnalysis | null>(null);
  const [currentTopic, setCurrentTopic] = useState<string>('');
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && view === 'chat') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, view]);

  // Auth observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setMessages([
        {
          id: '1',
          sender: Sender.AI,
          text: language === Language.KRIO 
            ? "Welcome to DoxaCare — Your trusted health assistant fɔ Sierra Leone. Aw can I help yu tide? \n\n1. Check yu ɛlt\n2. Find Nearby Clinic/Pharmacy\n3. Ɛlt ripɔt\n4. Mɛntal Ɛlt ɛn Drɔgs Ɛp\n5. Bɛlɛ ɛn Pikin"
            : "Welcome to DoxaCare — Your trusted health assistant for Sierra Leone. How can I help you today? \n\n1. Health Check\n2. Find Nearby Clinic/Pharmacy\n3. Health Report\n4. Mental Health & Drug Abuse\n5. Maternal & Child Care\n6. Emergency Help",
          timestamp: new Date(),
        }
      ]);
      setActiveConversationId(null);
      setView('home');
    } catch (err) {
      console.error("Sign out error", err);
    }
  };

  const handleNewChat = () => {
    setMessages([
      {
        id: '1',
        sender: Sender.AI,
        text: language === Language.KRIO 
          ? "Welcome to DoxaCare — Your trusted health assistant fɔ Sierra Leone. Aw can I help yu tide? \n\n1. Check yu ɛlt\n2. Find Nearby Clinic/Pharmacy\n3. Ɛlt ripɔt\n4. Mɛntal Ɛlt ɛn Drɔgs Ɛp\n5. Bɛlɛ ɛn Pikin"
          : "Welcome to DoxaCare — Your trusted health assistant for Sierra Leone. How can I help you today? \n\n1. Health Check\n2. Find Nearby Clinic/Pharmacy\n3. Health Report\n4. Mental Health & Drug Abuse\n5. Maternal & Child Care\n6. Emergency Help",
        timestamp: new Date(),
      }
    ]);
    setActiveConversationId(null);
    setView('chat');
  };

  const handleResumeConversation = async (conversationId: string) => {
    setIsLoading(true);
    setView('chat');
    setActiveConversationId(conversationId);
    try {
      const dbMsgs = await fetchConversationMessages(conversationId);
      if (dbMsgs.length > 0) {
        const parsed: Message[] = dbMsgs.map(m => ({
          id: m.id,
          sender: m.sender === 'user' ? Sender.USER : Sender.AI,
          text: m.text,
          timestamp: new Date(m.timestamp),
          groundingSources: m.groundingSources,
        }));
        setMessages(parsed);
      } else {
        setMessages([
          {
            id: '1',
            sender: Sender.AI,
            text: language === Language.KRIO 
              ? "Welcome back. Ask me any health questions." 
              : "Welcome back to this conversation. Ask me any health questions.",
            timestamp: new Date(),
          }
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.log("Location access denied."),
        { timeout: 10000 }
      );
    }
  }, []);

  const handleAcceptDisclaimer = () => {
    setHasAcceptedDisclaimer(true);
    localStorage.setItem('doxacare_accepted_v1', 'true');
  };

  const handleSend = async (text?: string) => {
    const messageText = text || inputValue;
    if (!messageText.trim() || isLoading) return;

    setView('chat');

    const userMsgId = Date.now().toString();
    const userMsg: Message = {
      id: userMsgId,
      sender: Sender.USER,
      text: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    let convoId = activeConversationId;
    
    if (currentUser && !convoId) {
      convoId = 'convo_' + userMsgId;
      setActiveConversationId(convoId);
      try {
        await createOrUpdateConversation(convoId, messageText.slice(0, 32) + (messageText.length > 32 ? '...' : ''));
      } catch (err) {
        console.error("Could not write conversation header:", err);
      }
    }

    if (currentUser && convoId) {
      try {
        await saveMessageToDb(convoId, userMsgId, 'user', messageText);
      } catch (err) {
        console.error("Could not save to DB:", err);
      }
    }

    const history = messages.map(m => ({
      role: m.sender === Sender.AI ? 'model' : 'user' as 'model' | 'user',
      parts: [{ text: m.text }]
    }));

    const response = await sendMessage(messageText, history, userLocation);

    const aiMsgId = (Date.now() + 1).toString();
    const aiMsg: Message = {
      id: aiMsgId,
      sender: Sender.AI,
      text: response.text,
      groundingSources: response.groundingSources,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);

    if (currentUser && convoId) {
      try {
        await saveMessageToDb(convoId, aiMsgId, 'model', response.text, response.groundingSources);
      } catch (err) {
        console.error("Could not save AI answer to DB:", err);
      }
    }
  };

  const handleHealthCheckSearch = async (topic: string) => {
    setIsLoading(true);
    setCurrentTopic(topic);
    try {
      const analysis = await analyzeHealthTopic(topic, language === Language.KRIO ? "Krio" : "English");
      setCurrentAnalysis(analysis);
      setView('health-result');
    } catch (e) {
      console.error(e);
      handleSend(topic);
    }
    setIsLoading(false);
  };

  const handleSelectOption = (option: NavMenuOption) => {
    if (option.id === '6') {
      window.location.href = "tel:117";
      return;
    }
    if (option.id === 'health-check') setView('health-check');
    else if (option.id === 'clinic-finder') setView('clinic-finder');
    else if (option.id === 'health-report') setView('health-report');
    else if (option.id === 'medications') setView('medications');
    else if (option.id === 'bookings') setView('bookings');
    else if (option.id === '4') setView('mental-health');
    else if (option.id === 'maternal-care') setView('maternal-care');
    else if (option.id === '0') handleNewChat();
    else handleSend(option.label);
  };

  const handleBack = () => {
    if (view === 'health-result') {
      setView('health-check');
    } else {
      setView('home');
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-white shadow-2xl relative">
      {!hasAcceptedDisclaimer && (
        <DisclaimerModal language={language} onAccept={handleAcceptDisclaimer} />
      )}

      <Header 
        view={view} 
        onBack={handleBack}
        language={language}
        setLanguage={setLanguage}
        currentUser={currentUser}
        onSignOut={handleSignOut}
        onNavigateToView={(v) => {
          if (v === 'chat') {
            handleNewChat();
          } else {
            setView(v);
          }
        }}
      />

      <div className="bg-yellow-50 px-4 py-2 text-[10px] text-yellow-800 border-b border-yellow-100 flex items-start flex-shrink-0 z-10">
        <i className="fas fa-info-circle mt-0.5 mr-2"></i>
        <span>DISCLAIMER: This is an AI assistant, NOT a doctor. In emergencies, call 117.</span>
      </div>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {view === 'home' && (
          <HomePage 
            onSelectOption={handleSelectOption} 
            onViewCasebook={() => setView('case-vault')} 
            language={language} 
          />
        )}
        {view === 'health-check' && (
          <div className="flex-1 flex flex-col relative overflow-hidden">
            <HealthCheckView language={language} onSearch={handleHealthCheckSearch} />
            {isLoading && <LoadingOverlay language={language} color="green" />}
          </div>
        )}
        {view === 'health-report' && <HealthReportView language={language} />}
        {view === 'maternal-care' && (
           <div className="flex-1 flex flex-col relative overflow-hidden">
            <MaternalCareView language={language} onSearch={handleHealthCheckSearch} />
            {isLoading && <LoadingOverlay language={language} color="pink" />}
          </div>
        )}
        {view === 'mental-health' && (
           <div className="flex-1 flex flex-col relative overflow-hidden">
            <MentalHealthView language={language} onSearch={handleHealthCheckSearch} />
            {isLoading && <LoadingOverlay language={language} color="blue" />}
          </div>
        )}
        {view === 'health-result' && currentAnalysis && (
          <HealthResultView 
            analysis={currentAnalysis} 
            topic={currentTopic} 
            language={language} 
            onSaveBrief={() => setView('case-vault')}
          />
        )}
        {view === 'clinic-finder' && (
          <ClinicView 
            language={language} 
            onLoginRedirect={() => setView('login')} 
          />
        )}
        {view === 'medications' && (
          <MedicationsView 
            language={language} 
            onBack={() => setView('home')} 
          />
        )}
        {view === 'bookings' && (
          <BookingsView 
            language={language} 
            onBackToClinics={() => setView('clinic-finder')} 
            onLoginRedirect={() => setView('login')} 
          />
        )}
        {view === 'chats' && (
          <ChatsListView 
            language={language} 
            onResumeConversation={handleResumeConversation} 
            onBackToWellness={handleNewChat} 
            onLoginRedirect={() => setView('login')} 
          />
        )}
        {view === 'login' && (
          <AuthView 
            language={language} 
            onSuccess={() => setView('home')} 
            onBack={() => setView('home')} 
          />
        )}
        {view === 'case-vault' && (
          <CaseVaultView 
            language={language} 
            onBackToWellness={() => setView('health-check')} 
          />
        )}
        {view === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 bg-gray-50 scroll-smooth">
              {messages.map((msg) => <ChatBubble key={msg.id} message={msg} />)}
              {isLoading && <ThinkingBubble />}
            </div>
            <ChatInput 
              language={language} 
              onSend={handleSend} 
              isLoading={isLoading} 
              inputValue={inputValue} 
              setInputValue={setInputValue}
              navOptions={DOXA_AI_NAV_MENU}
              onOptionSelect={handleSelectOption}
            />
          </div>
        )}
      </main>
    </div>
  );
};

const LoadingOverlay = ({ language, color }: any) => (
  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
    <div className="text-center">
      <div className={`w-12 h-12 border-4 border-${color}-600 border-t-transparent rounded-full animate-spin mx-auto mb-4`}></div>
      <p className={`text-${color}-800 font-bold`}>{language === Language.KRIO ? "Doxa de check..." : "Doxa is analyzing..."}</p>
    </div>
  </div>
);

const ThinkingBubble = () => (
  <div className="flex justify-start mb-4">
    <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center space-x-2">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce [animation-delay:-.3s]"></div>
      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce [animation-delay:-.5s]"></div>
      <span className="text-xs text-gray-400 font-medium ml-2">Thinking...</span>
    </div>
  </div>
);

const ChatInput = ({ language, onSend, isLoading, inputValue, setInputValue, navOptions, onOptionSelect }: any) => (
  <div className="bg-white border-t border-gray-200 shadow-2xl">
    <div className="flex overflow-x-auto p-2 gap-2 no-scrollbar bg-gray-50 border-b border-gray-100">
      {navOptions.map((opt: any) => (
        <button key={opt.id} onClick={() => onOptionSelect(opt)} className="flex-shrink-0 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-[10px] font-bold text-gray-600 hover:bg-gray-50 active:scale-95 transition-all">
          <i className={`fas ${opt.icon} mr-1.5`}></i>
          {language === Language.KRIO ? opt.krioLabel : opt.label}
        </button>
      ))}
    </div>
    <div className="p-4">
      <form onSubmit={(e) => { e.preventDefault(); onSend(); }} className="flex items-center space-x-2 bg-gray-100 rounded-full px-4 py-1 border border-gray-200 focus-within:ring-2 focus-within:ring-green-500 transition-all shadow-inner">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={language === Language.KRIO ? "Tɛl wi wetin de du yu..." : "Describe symptoms..."}
          className="flex-1 bg-transparent py-3 focus:outline-none text-gray-800 text-sm"
        />
        <button type="submit" disabled={isLoading || !inputValue.trim()} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${!inputValue.trim() || isLoading ? 'bg-gray-300 text-gray-500' : 'bg-green-600 text-white shadow-md active:scale-90'}`}>
          <i className="fas fa-paper-plane text-sm"></i>
        </button>
      </form>
    </div>
  </div>
);

export default App;
