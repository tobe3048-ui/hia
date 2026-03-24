import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Link, Navigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, ChevronRight, Mail, Lock, Eye, EyeOff, Camera, LogOut, 
  User as UserIcon, Settings, MapPin, MessageSquare, Heart,
  Star, ArrowUpRight, Ruler, Clock, Globe, MoreHorizontal,
  Weight as WeightIcon, Target, ArrowUp, ArrowUpRight as VersTop, ArrowUpDown, ArrowDownRight as VersBottom, ArrowDown, MoveHorizontal, X, Search,
  Plus, Crown, SlidersHorizontal, Image as ImageIcon, AlertCircle, Ban, Send
} from 'lucide-react';
import { cn } from './lib/utils';
import { api } from './lib/api';

// --- Types & Context ---

interface LayoutContextType {
  activeDesktopChat: string | null;
  setActiveDesktopChat: (userId: string | null) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) throw new Error('useLayout must be used within a LayoutProvider');
  return context;
};

interface User {
  id: number;
  email: string;
  displayName: string;
  age?: number;
  photoUrl?: string;
  profilePhotoUrl?: string;
  profilePhotoThumbUrl?: string;
  position?: string;
  showAge?: boolean;
  isOnline?: boolean;
  lastOnline?: string;
  lastSeen?: string | Date;
  lookingFor?: string;
  distance?: string;
  distanceValue?: number;
  headline?: string;
  ethnicity?: string;
  height?: string;
  weight?: string;
  bodyType?: string;
  relationshipStatus?: string;
  role?: string;
  photos?: { id: number; photoData: string; isLocked: boolean }[];
  isUnlocked?: boolean;
  latitude?: number;
  longitude?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  locationError: string | null;
  updateLocation: () => Promise<void>;
  retryingLocation: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true,
  locationError: null,
  updateLocation: async () => {},
  retryingLocation: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  unreadCount: 0,
  setUnreadCount: () => {}
});

const useAuth = () => useContext(AuthContext);

// --- Constants ---

const formatLastSeen = (lastSeen: string | Date | undefined) => {
  if (!lastSeen) return null;
  const date = new Date(lastSeen);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 5) return null;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const isOnline = (lastSeen: string | Date | undefined) => {
  if (!lastSeen) return false;
  const date = new Date(lastSeen);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return diff < 300000; // 5 minutes
};

const formatOnlineStatus = (lastSeen: string | Date | undefined) => {
  if (!lastSeen) return 'Offline';
  const date = new Date(lastSeen);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 5) return 'Online now';
  if (minutes < 60) return `Active ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Active ${hours}h ago`;
  return `Active ${Math.floor(hours / 24)}d ago`;
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // in metres
};

const STATS_OPTIONS = [
  { id: 'lookingFor', label: 'Looking for', icon: Search, choices: ['Hookups', 'Friends', 'Relationship', 'Right Now', 'Chat'] },
  { id: 'ethnicity', label: 'Ethnicity', icon: Globe, choices: ['Asian', 'Black', 'Latino', 'Middle Eastern', 'Mixed', 'Other', 'South Asian', 'White'] },
  { id: 'height', label: 'Height', icon: Ruler, choices: ['4\' 0"', '4\' 1"', '4\' 2"', '4\' 3"', '4\' 4"', '4\' 5"', '4\' 6"', '4\' 7"', '4\' 8"', '4\' 9"', '4\' 10"', '4\' 11"', '5\' 0"', '5\' 1"', '5\' 2"', '5\' 3"', '5\' 4"', '5\' 5"', '5\' 6"', '5\' 7"', '5\' 8"', '5\' 9"', '5\' 10"', '5\' 11"', '6\' 0"', '6\' 1"', '6\' 2"', '6\' 3"', '6\' 4"', '6\' 5"', '6\' 6"', '6\' 7"', '6\' 8"', '6\' 9"', '6\' 10"', '6\' 11"', '7\' 0"'] },
  { id: 'weight', label: 'Weight', icon: WeightIcon, choices: Array.from({ length: 201 }, (_, i) => (i + 100).toString() + ' lb') },
  { id: 'position', label: 'Role', icon: Target, choices: [
    { label: 'Top', icon: ArrowUp },
    { label: 'Vers Top', icon: VersTop },
    { label: 'Versatile', icon: ArrowUpDown },
    { label: 'Vers Bottom', icon: VersBottom },
    { label: 'Bottom', icon: ArrowDown },
    { label: 'Side', icon: MoveHorizontal },
    { label: 'Not Specified', icon: X },
  ]},
  { id: 'bodyType', label: 'Body Type', icon: UserIcon, choices: ['Slim', 'Average', 'Athletic', 'Muscular', 'Large', 'Extra Large'] },
  { id: 'relationshipStatus', label: 'Relationship', icon: Heart, choices: ['Single', 'Committed', 'Dating', 'Disclosed', 'Married', 'Open Relationship'] },
];

// --- Components ---

const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  loading = false,
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline', loading?: boolean }) => {
  const variants = {
    primary: 'bg-yellow-500 hover:bg-yellow-400 text-black disabled:bg-yellow-800',
    secondary: 'bg-zinc-800 hover:bg-zinc-700 text-white disabled:bg-zinc-900',
    outline: 'border border-zinc-700 hover:bg-zinc-800 text-white disabled:border-zinc-900'
  };

  return (
    <button 
      disabled={loading || props.disabled}
      className={cn(
        'w-full py-4 rounded-xl font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2',
        variants[variant],
        className
      )}
      {...props}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : children}
    </button>
  );
};

const Input = React.forwardRef(({ icon: Icon, label, type = 'text', error, ...props }: any, ref: any) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-yellow-500 transition-colors">
        {Icon && <Icon size={20} />}
      </div>
      <input
        ref={ref}
        type={inputType}
        className={cn(
          "w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-4 pl-12 pr-12 text-white placeholder:text-zinc-600 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500/50"
        )}
        {...props}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      )}
      {error && <p className="text-red-500 text-xs mt-1 ml-2">{error}</p>}
    </div>
  );
});

const ProgressBar = ({ step, total }: { step: number; total: number }) => (
  <div className="flex justify-center gap-2 mb-12">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className={cn(
          "h-1.5 w-1.5 rounded-full transition-all duration-300",
          i + 1 <= step ? "bg-yellow-500 w-4" : "bg-zinc-800"
        )}
      />
    ))}
  </div>
);

const Picker = ({ 
  options, 
  value, 
  onChange, 
  onClose, 
  onSave, 
  title 
}: { 
  options: any[], 
  value: string, 
  onChange: (val: string) => void, 
  onClose: () => void, 
  onSave: () => void,
  title: string
}) => {
  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
      />
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-x-0 bottom-0 bg-zinc-900 text-white rounded-t-[1.5rem] z-[100] flex flex-col max-h-[80vh] shadow-2xl pb-safe"
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-zinc-900 rounded-t-[1.5rem]">
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-white">
            <X size={20} />
          </button>
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onSave} className="text-yellow-500 font-bold text-lg px-2">
            Save
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-8 relative bg-zinc-900">
          {/* Selection Highlight */}
          <div className="absolute top-1/2 left-0 right-0 h-12 bg-zinc-800 -translate-y-1/2 pointer-events-none mx-4 rounded-xl" />
          
          <div className="relative z-10 flex flex-col items-center">
            {options.map((opt) => {
              const label = typeof opt === 'object' ? opt.label : opt;
              const isSelected = value === label;
              return (
                <button
                  key={label}
                  onClick={() => onChange(label)}
                  className={cn(
                    "h-12 flex items-center justify-center w-full transition-all text-lg",
                    isSelected ? "text-yellow-500 font-bold scale-110" : "text-zinc-500 font-medium"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </>
  );
};

// --- Pages ---

const LandingPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  if (!loading && user) return <Navigate to="/home" />;

  return (
    <div className="h-full bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden font-display">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-yellow-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-yellow-600/10 blur-[120px] rounded-full" />
      
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-32 relative"
      >
        <h1 className="text-9xl font-black tracking-tighter drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] bg-gradient-to-br from-yellow-200 via-yellow-500 to-yellow-600 text-transparent bg-clip-text font-display">
          hia
        </h1>
        <div className="absolute -inset-4 bg-white/5 blur-2xl rounded-full -z-10" />
      </motion.div>
      
      <div className="w-full max-w-sm space-y-6 relative z-10">
        <Button 
          onClick={() => navigate('/register')}
          className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black font-bold text-lg shadow-[0_0_30px_rgba(234,179,8,0.3)] hover:shadow-[0_0_40px_rgba(234,179,8,0.5)] border-none"
        >
          Create an Account
        </Button>
        <p className="text-white/60 font-medium text-sm">
          Already have an account? <Link to="/login" className="text-yellow-500 hover:text-yellow-400 transition-colors font-bold">Log in</Link>
        </p>
      </div>
    </div>
  );
};

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/home');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full bg-[#0a0a0a] flex flex-col items-center justify-center p-6 font-display overflow-y-auto scrollbar-hide">
      <div className="w-full max-w-md">
        <h2 className="text-4xl font-bold text-white mb-8 text-center">Welcome back</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <Input icon={Mail} placeholder="Email" type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} required />
          <Input icon={Lock} placeholder="Password" type="password" value={password} onChange={(e: any) => setPassword(e.target.value)} required />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <Button type="submit" loading={loading}>Log In</Button>
        </form>
        <p className="text-center mt-8 text-zinc-500">
          Don't have an account? <Link to="/register" className="text-yellow-500 font-semibold hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
};

const RegisterFlow = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    dob: { mm: '', dd: '', yyyy: '' },
    showAge: true,
    height: '',
    weight: '',
    bodyType: '',
    position: 'Not Specified',
    ethnicity: '',
    relationshipStatus: '',
    lookingFor: '',
    photoUrl: '',
    thumbUrl: '',
    fileName: '',
    thumbFileName: ''
  });
  const [activeSelection, setActiveSelection] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailExists, setEmailExists] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const emailRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 1) {
      setTimeout(() => emailRef.current?.focus(), 100);
    } else if (step === 2) {
      setTimeout(() => monthRef.current?.focus(), 100);
    }
  }, [step]);

  useEffect(() => {
    const checkEmail = async () => {
      if (!formData.email || !formData.email.includes('@')) {
        setEmailExists(false);
        return;
      }
      try {
        const res = await api.get(`/api/auth/check-email?email=${encodeURIComponent(formData.email)}`);
        setEmailExists(res.exists);
      } catch (err) {
        console.error('Email check failed:', err);
      }
    };

    const timer = setTimeout(checkEmail, 500);
    return () => clearTimeout(timer);
  }, [formData.email]);

  const handleRegister = async () => {
    setLoading(true);
    setError('');
    try {
      const birthDate = new Date(parseInt(formData.dob.yyyy), parseInt(formData.dob.mm) - 1, parseInt(formData.dob.dd));
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      if (age < 18) throw new Error("You must be 18+ to use this service.");

      await register({
        email: formData.email,
        password: formData.password,
        displayName: formData.email.split('@')[0],
        age: age,
        showAge: formData.showAge,
        height: formData.height,
        weight: formData.weight,
        bodyType: formData.bodyType,
        position: formData.position,
        ethnicity: formData.ethnicity,
        relationshipStatus: formData.relationshipStatus,
        lookingFor: formData.lookingFor,
        profilePhotoUrl: formData.photoUrl,
        profilePhotoThumbUrl: formData.thumbUrl
      });

      // Navigation will be handled by AuthProvider state change or manual navigate
      // but now AuthProvider loading state will prevent premature redirect
      navigate('/home');
    } catch (err: any) {
      setError(err.message);
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const next = () => {
    if (step < 4) setStep(step + 1);
    else handleRegister();
  };

  const back = () => {
    if (step > 1) setStep(step - 1);
    else navigate('/');
  };

  return (
    <div className="h-full bg-[#0a0a0a] text-white overflow-x-hidden selection:bg-yellow-500/30 font-display overflow-y-auto scrollbar-hide">
      <div className="max-w-md mx-auto px-6 pt-12 pb-20">
        <ProgressBar step={step} total={4} />

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-2">Create your account</h2>
                <p className="text-zinc-500">Enter your email and password</p>
              </div>
              <div className="space-y-4">
                <Input 
                  ref={emailRef} 
                  icon={Mail} 
                  placeholder="Email Address" 
                  type="email" 
                  value={formData.email} 
                  onChange={(e: any) => setFormData({...formData, email: e.target.value})}
                  error={emailExists ? "Email already exists" : null}
                />
                <Input icon={Lock} placeholder="Create a password" type="password" value={formData.password} onChange={(e: any) => setFormData({...formData, password: e.target.value})} />
                <Input icon={Lock} placeholder="Confirm your password" type="password" value={formData.confirmPassword} onChange={(e: any) => setFormData({...formData, confirmPassword: e.target.value})} />
              </div>
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              <Button onClick={next} disabled={!formData.email || !formData.password || formData.password !== formData.confirmPassword || emailExists}>Next</Button>
              <p className="text-center text-zinc-500">
                Already have an account? <Link to="/login" className="text-yellow-500 font-semibold hover:underline">Log in</Link>
              </p>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-2">What is your date of birth?</h2>
                <p className="text-zinc-500 text-sm leading-relaxed">You must be 18+ to use this service. Your date of birth is not stored in our database, just your age.</p>
              </div>
              <div className="flex justify-center items-center gap-4">
                <div className="text-center">
                  <span className="text-zinc-500 text-xs uppercase font-bold mb-2 block">Month</span>
                  <input 
                    ref={monthRef}
                    placeholder="MM" 
                    maxLength={2} 
                    value={formData.dob.mm} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({...formData, dob: {...formData.dob, mm: val}});
                      if (val.length === 2) dayRef.current?.focus();
                    }} 
                    className="w-20 bg-zinc-900/50 border border-zinc-800 rounded-xl py-4 text-center text-xl text-white focus:border-yellow-500 outline-none transition-all" 
                  />
                </div>
                <span className="text-zinc-700 text-2xl mt-6">/</span>
                <div className="text-center">
                  <span className="text-zinc-500 text-xs uppercase font-bold mb-2 block">Day</span>
                  <input 
                    ref={dayRef}
                    placeholder="DD" 
                    maxLength={2} 
                    value={formData.dob.dd} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({...formData, dob: {...formData.dob, dd: val}});
                      if (val.length === 2) yearRef.current?.focus();
                    }} 
                    className="w-20 bg-zinc-900/50 border border-zinc-800 rounded-xl py-4 text-center text-xl text-white focus:border-yellow-500 outline-none transition-all" 
                  />
                </div>
                <span className="text-zinc-700 text-2xl mt-6">/</span>
                <div className="text-center">
                  <span className="text-zinc-500 text-xs uppercase font-bold mb-2 block">Year</span>
                  <input 
                    ref={yearRef}
                    placeholder="YYYY" 
                    maxLength={4} 
                    value={formData.dob.yyyy} 
                    onChange={(e) => setFormData({...formData, dob: {...formData.dob, yyyy: e.target.value}})} 
                    className="w-28 bg-zinc-900/50 border border-zinc-800 rounded-xl py-4 text-center text-xl text-white focus:border-yellow-500 outline-none transition-all" 
                  />
                </div>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400"><Eye size={20} /></div>
                  <div>
                    <p className="text-white font-semibold">Show age on profile</p>
                    <p className="text-zinc-500 text-xs">Your age is visible to others</p>
                  </div>
                </div>
                <div 
                  onClick={() => setFormData({...formData, showAge: !formData.showAge})}
                  className={cn("w-12 h-6 rounded-full relative cursor-pointer transition-colors", formData.showAge ? "bg-yellow-500" : "bg-zinc-700")}
                >
                  <motion.div animate={{ x: formData.showAge ? 24 : 4 }} className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                </div>
              </div>
              <div className="flex gap-4 pt-8">
                <Button variant="secondary" onClick={back}>Back</Button>
                <Button onClick={next} disabled={!formData.dob.mm || !formData.dob.dd || !formData.dob.yyyy}>Next</Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-xl font-bold uppercase tracking-widest text-zinc-500">Attributes</h2>
              </div>

              <div className="bg-zinc-900/40 rounded-3xl overflow-hidden border border-zinc-800/50">
                {STATS_OPTIONS.map((opt, idx) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setActiveSelection(opt.id);
                      setTempValue((formData as any)[opt.id] || '');
                    }}
                    className={cn(
                      "w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors text-left",
                      idx !== STATS_OPTIONS.length - 1 && "border-b border-zinc-800/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <opt.icon size={20} className="text-zinc-500" />
                      <span className="text-lg font-medium text-white">{opt.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400 font-medium">
                        {(formData as any)[opt.id] || '--'}
                      </span>
                      <ChevronLeft size={18} className="rotate-180 text-zinc-700" />
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-4 pt-8">
                <Button variant="secondary" onClick={back}>Back</Button>
                <Button onClick={next}>Next</Button>
              </div>

              <AnimatePresence>
                {activeSelection && (
                  <Picker
                    title={STATS_OPTIONS.find(o => o.id === activeSelection)?.label || ''}
                    options={STATS_OPTIONS.find(o => o.id === activeSelection)?.choices || []}
                    value={tempValue}
                    onChange={setTempValue}
                    onClose={() => setActiveSelection(null)}
                    onSave={() => {
                      setFormData({ ...formData, [activeSelection]: tempValue });
                      setActiveSelection(null);
                    }}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="s4" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-2">Add a profile photo</h2>
                <p className="text-zinc-500">Take a selfie or choose from your library</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-40 h-40 rounded-3xl bg-zinc-900 border-4 border-zinc-800 flex items-center justify-center relative overflow-hidden group">
                  {formData.photoUrl ? (
                    <>
                      <img 
                        src={formData.photoUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                        referrerPolicy="no-referrer"
                        onLoad={() => console.log('Image loaded successfully')}
                        onError={(e) => {
                          console.error('Image failed to load:', formData.photoUrl);
                          // Optional: show a fallback or error state
                        }}
                      />
                      {loading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-zinc-600">
                      <Camera size={40} />
                      <span className="text-[10px] uppercase font-bold tracking-widest">No Photo</span>
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-3xl border-2 border-dashed border-zinc-700 animate-spin-slow pointer-events-none" />
                </div>
                <div className="w-full border-2 border-dashed border-zinc-800 rounded-3xl p-8 mt-8 flex flex-col items-center gap-4 bg-zinc-900/20">
                  <input 
                    type="file" 
                    id="photo-upload"
                    className="hidden" 
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      const uploadFormData = new FormData();
                      uploadFormData.append('file', file);
                      
                      try {
                        setLoading(true);
                        const response = await fetch('/api/upload', {
                          method: 'POST',
                          body: uploadFormData,
                        });
                        if (!response.ok) throw new Error('Upload failed');
                        const data = await response.json();
                        setFormData({
                          ...formData, 
                          photoUrl: data.url, 
                          thumbUrl: data.thumbUrl,
                          fileName: data.fileName,
                          thumbFileName: data.thumbFileName
                        });
                      } catch (err) {
                        console.error('Upload error:', err);
                        alert('Failed to upload photo');
                      } finally {
                        setLoading(false);
                      }
                    }}
                  />
                  {!formData.photoUrl ? (
                    <Button className="max-w-[200px]" onClick={() => document.getElementById('photo-upload')?.click()} loading={loading}>
                      Choose Photo
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="max-w-[200px] border-red-500/50 text-red-500 hover:bg-red-500/10" 
                      onClick={async () => {
                        try {
                          setLoading(true);
                          await fetch('/api/upload/delete', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              fileName: formData.fileName, 
                              thumbFileName: formData.thumbFileName 
                            }),
                          });
                          setFormData({
                            ...formData, 
                            photoUrl: '', 
                            thumbUrl: '', 
                            fileName: '', 
                            thumbFileName: '' 
                          });
                        } catch (err) {
                          console.error('Delete error:', err);
                          alert('Failed to delete photo');
                        } finally {
                          setLoading(false);
                        }
                      }} 
                      loading={loading}
                    >
                      Delete Photo
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-center text-zinc-500 text-sm px-8">Your profile photo is shown on the nearby profiles screen. You can change it anytime in your profile.</p>
              <div className="flex gap-4 pt-8">
                <Button variant="secondary" onClick={back}>Back</Button>
                <Button onClick={next} loading={loading}>Complete</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const EditProfilePage = () => {
  const { user, loading } = useAuth();
  const [formData, setFormData] = useState<any>(null);
  const [activeSelection, setActiveSelection] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      setFormData({ ...user });
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/api/users/me', formData);
      navigate(`/profile/${user?.id}`);
    } catch (err) {
      console.error('Failed to save profile:', err);
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (file: File, isPrimary: boolean = false) => {
    setUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      
      const res = await api.post('/api/upload', uploadData);
      
      if (isPrimary) {
        setFormData({ ...formData, profilePhotoUrl: res.url, profilePhotoThumbUrl: res.thumbUrl });
      } else {
        const newPhoto = await api.post('/api/photos', {
          photoData: res.url,
          isLocked: false,
          displayOrder: (formData.photos?.length || 0) + 1
        });
        setFormData({ ...formData, photos: [...(formData.photos || []), newPhoto] });
      }
    } catch (err) {
      console.error('Failed to upload photo:', err);
      alert('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoDelete = async (photoId: number | 'primary') => {
    if (!confirm('Are you sure you want to delete this photo?')) return;
    
    try {
      if (photoId === 'primary') {
        await api.delete('/api/users/me/profile-photo');
        setFormData({ ...formData, profilePhotoUrl: null, profilePhotoThumbUrl: null });
      } else {
        await api.delete(`/api/photos/${photoId}`);
        setFormData({ ...formData, photos: formData.photos.filter((p: any) => p.id !== photoId) });
      }
    } catch (err) {
      console.error('Failed to delete photo:', err);
      alert('Failed to delete photo');
    }
  };

  if (loading || !formData) return <div className="h-full bg-black flex items-center justify-center text-white">Loading...</div>;
  if (!user) return <Navigate to="/" />;

  const PhotoSlot = ({ 
    isPrimary = false, 
    url = null, 
    photoId = null,
    isPrivate = false
  }: any) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
      <div className="aspect-square bg-zinc-900 rounded-xl border border-white/5 flex items-center justify-center relative overflow-hidden group">
        {url ? (
          <>
            <img src={url} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (photoId) handlePhotoDelete(photoId);
              }}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-full flex items-center justify-center text-zinc-700 hover:text-yellow-500 transition-colors cursor-pointer"
          >
            {uploading ? <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" /> : <Plus size={24} />}
          </div>
        )}
        
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handlePhotoUpload(file, isPrimary);
          }}
        />

        {isPrimary && (
          <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-black shadow-sm">
            <Crown size={12} fill="currentColor" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full bg-[#0a0a0a] text-white font-display pb-20 overflow-y-auto scrollbar-hide">
      <header className="bg-zinc-900 px-4 py-3 flex items-center justify-between border-b border-white/10 sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="text-white font-medium text-lg">Cancel</button>
        <h1 className="text-lg font-bold">Edit Profile</h1>
        <button onClick={handleSave} disabled={saving} className="text-yellow-500 font-bold text-lg">
          {saving ? '...' : 'Save'}
        </button>
      </header>

      <main className="max-w-md mx-auto space-y-8 py-6">
        {/* Photo Gallery Section */}
        <section className="px-4 space-y-3">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Photo Gallery</h3>
          <div className="grid grid-cols-4 gap-3">
            <PhotoSlot isPrimary url={formData.profilePhotoUrl || formData.photoUrl} photoId="primary" />
            {formData.photos?.filter((p: any) => !p.isLocked).map((p: any) => (
              <PhotoSlot key={p.id} url={p.photoData} photoId={p.id} />
            ))}
            {Array.from({ length: Math.max(0, 3 - (formData.photos?.filter((p: any) => !p.isLocked).length || 0)) }).map((_, i) => (
              <PhotoSlot key={`empty-public-${i}`} />
            ))}
          </div>
        </section>

        {/* Private Photos Section */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold text-zinc-500 uppercase px-4 tracking-widest">Private Photos</h3>
          <div className="bg-zinc-900 py-6 px-4">
            <div className="grid grid-cols-4 gap-3">
              {formData.photos?.filter((p: any) => p.isLocked).map((p: any) => (
                <PhotoSlot key={p.id} url={p.photoData} photoId={p.id} isPrivate />
              ))}
              {Array.from({ length: Math.max(0, 4 - (formData.photos?.filter((p: any) => p.isLocked).length || 0)) }).map((_, i) => (
                <PhotoSlot key={`empty-private-${i}`} isPrivate />
              ))}
            </div>
          </div>
        </section>

        {/* Show Distance Section */}
        <section className="bg-zinc-900 border-y border-white/10">
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="text-lg font-bold">Show distance</p>
              <p className="text-zinc-500 text-sm">Show distance on your profile</p>
            </div>
            <div 
              onClick={() => setFormData({...formData, showDistance: !formData.showDistance})}
              className={cn("w-14 h-8 rounded-full relative cursor-pointer transition-colors p-1", formData.showDistance ? "bg-yellow-500" : "bg-zinc-800")}
            >
              <motion.div 
                animate={{ x: formData.showDistance ? 24 : 0 }} 
                className="w-6 h-6 bg-white rounded-full shadow-md" 
              />
            </div>
          </div>
        </section>

        {/* Attributes Section */}
        <section className="space-y-2">
          <h3 className="text-xs font-bold text-zinc-500 uppercase px-4 tracking-widest">Attributes</h3>
          <div className="bg-zinc-900 border-y border-white/10">
            {/* Age Row - Read Only */}
            <div className="w-full p-4 flex items-center justify-between border-b border-white/5">
              <span className="text-lg font-medium">Age</span>
              <span className="text-zinc-500 font-medium pr-6">{formData.age || '--'}</span>
            </div>

            {STATS_OPTIONS.map((opt, idx) => (
              <button
                key={opt.id}
                onClick={() => {
                  setActiveSelection(opt.id);
                  setTempValue((formData as any)[opt.id] || '');
                }}
                className={cn(
                  "w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors text-left",
                  idx !== STATS_OPTIONS.length - 1 && "border-b border-white/5"
                )}
              >
                <span className="text-lg font-medium">{opt.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 font-medium">
                    {(formData as any)[opt.id] || '--'}
                  </span>
                  {!['height', 'weight'].includes(opt.id) && <ChevronLeft size={18} className="rotate-180 text-zinc-700" />}
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      <AnimatePresence>
        {activeSelection && (
          <Picker
            title={STATS_OPTIONS.find(o => o.id === activeSelection)?.label || ''}
            options={STATS_OPTIONS.find(o => o.id === activeSelection)?.choices || []}
            value={tempValue}
            onChange={setTempValue}
            onClose={() => setActiveSelection(null)}
            onSave={() => {
              setFormData({ ...formData, [activeSelection]: tempValue });
              setActiveSelection(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const ProfilePage = () => {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [fetching, setFetching] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const navigate = useNavigate();
  const isOwnProfile = user?.id === profile?.id;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await api.get(`/api/users/${id}`);
        // Combine profile photo with other photos
        const allPhotos = [];
        if (data.profilePhotoUrl) {
          allPhotos.push({ id: 0, photoData: data.profilePhotoUrl, isLocked: false });
        }
        if (data.photos && data.photos.length > 0) {
          allPhotos.push(...data.photos);
        }
        
        // If no photos at all, add a placeholder
        if (allPhotos.length === 0) {
          allPhotos.push({ id: -1, photoData: `https://picsum.photos/seed/user${data.id}/800/1000`, isLocked: false });
        }

        setProfile({
          ...data,
          photos: allPhotos,
          lastOnline: formatLastSeen(data.lastSeen) || 'Active Now',
          isOnline: isOnline(data.lastSeen),
          distance: data.distance || (user?.latitude ? 'Nearby' : 'Location Off'),
          headline: data.lookingFor || 'Just Looking',
          ethnicity: data.ethnicity || 'White',
          height: data.height || '5 ft, 11 in',
          weight: data.weight || '160 lb',
          role: data.role || 'Versatile',
          specificRole: 'Vers Top' // For the bottom bar
        } as any);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setFetching(false);
      }
    };
    fetchProfile();
  }, [id, user?.latitude, user?.longitude]);

  const nextPhoto = () => {
    if (!profile?.photos) return;
    setCurrentPhotoIndex((prev) => (prev + 1) % profile.photos!.length);
  };

  const prevPhoto = () => {
    if (!profile?.photos) return;
    setCurrentPhotoIndex((prev) => (prev - 1 + profile.photos!.length) % profile.photos!.length);
  };

  const handleSwipe = (e: any, info: any) => {
    if (info.offset.x < -50) nextPhoto();
    else if (info.offset.x > 50) prevPhoto();
  };

  if (loading || fetching) return <div className="h-full bg-black flex items-center justify-center text-white">Loading...</div>;
  if (!user) return <Navigate to="/" />;
  if (!profile) return <div className="h-full bg-black flex items-center justify-center text-white">Profile not found</div>;

  const currentPhoto = profile.photos?.[currentPhotoIndex];
  const isLocked = currentPhoto?.isLocked && !profile.isUnlocked && !isOwnProfile;

  return (
    <div className="h-full bg-[#0a0a0a] text-white pb-24 font-display overflow-y-auto scrollbar-hide">
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-20">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-black/20 backdrop-blur-sm text-white hover:bg-black/40 transition-colors">
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-2">
          {isOwnProfile && (
            <button 
              onClick={() => navigate('/edit-profile')}
              className="px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white font-bold text-sm hover:bg-white/30 transition-colors"
            >
              Edit
            </button>
          )}
          <button className="p-2 rounded-full bg-black/20 backdrop-blur-sm text-white hover:bg-black/40 transition-colors">
            <MoreHorizontal size={24} />
          </button>
        </div>
      </div>

      <main className="max-w-md mx-auto">
        {/* Image Section */}
        <div className="relative px-4 pt-4">
          <motion.div 
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleSwipe}
            className="aspect-[1/1.1] w-full bg-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 relative cursor-grab active:cursor-grabbing"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPhotoIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full relative"
              >
                <img 
                  src={currentPhoto?.photoData} 
                  alt="User profile" 
                  className={cn(
                    "w-full h-full object-cover transition-all duration-500",
                    isLocked && "blur-2xl scale-110"
                  )}
                  referrerPolicy="no-referrer"
                />
                
                {isLocked && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                    <Lock size={48} className="text-white mb-4 opacity-80" />
                    <p className="text-white font-bold text-center px-8 text-lg drop-shadow-lg">
                      Private Photo
                    </p>
                    <p className="text-white/70 text-sm text-center px-8 mt-2">
                      Ask them to unlock their private gallery
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons (Desktop/Tablet) */}
            {profile.photos && profile.photos.length > 1 && (
              <>
                <button 
                  onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                  className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white/80 hover:bg-black/50 hover:text-white transition-all z-20 group"
                >
                  <ChevronLeft size={24} className="group-hover:-translate-x-0.5 transition-transform" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                  className="absolute right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white/80 hover:bg-black/50 hover:text-white transition-all z-20 group"
                >
                  <ChevronRight size={24} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </>
            )}
            
            {/* Floating Action Buttons */}
            <div className="absolute bottom-6 right-10 flex flex-col gap-3 z-10">
              <button className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-yellow-500 shadow-xl active:scale-90 transition-transform">
                <Star size={28} fill="currentColor" />
              </button>
              <button 
                onClick={() => navigate(`/chat/${profile.id}`)}
                className="w-14 h-14 rounded-full bg-yellow-600 flex items-center justify-center text-white shadow-xl active:scale-90 transition-transform"
              >
                <MessageSquare size={28} fill="currentColor" />
              </button>
            </div>

            {/* Pagination Dots */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10">
              {profile.photos?.map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300", 
                    i === currentPhotoIndex ? "bg-white w-4" : "bg-white/40"
                  )} 
                />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Info Section */}
        <div className="px-8 pt-6 space-y-5">
          {/* Status Line */}
          <div className="flex items-center gap-4 text-sm font-medium text-zinc-300">
            <div className="flex items-center gap-1.5">
              <div className={cn(
                "w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]",
                profile.isOnline ? "bg-emerald-500" : "bg-amber-400"
              )} />
              <span>{profile.isOnline ? 'Online Now' : `Online ${profile.lastOnline}`}</span>
            </div>
          </div>

          {/* Headline */}
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white leading-tight">
              {profile.headline}
            </h2>
          </div>

          {/* Identity Line */}
          <div className="flex items-center gap-3 text-zinc-300 font-medium">
            <UserIcon size={20} className="text-zinc-500" />
            <span>{profile.ethnicity || 'Not Specified'}, {profile.height || 'Not Specified'}, {profile.position || 'Not Specified'}</span>
          </div>
        </div>

        {/* Grey Bar at the Bottom */}
        <div className="mt-10 px-4">
          <div className="bg-[#2a2a2a] rounded-xl overflow-hidden flex items-stretch border border-white/5">
            <div className="flex-1 flex items-center gap-3 px-4 py-3 border-r border-white/5 hover:bg-white/5 transition-colors cursor-pointer">
              <ArrowUpRight size={20} className="text-zinc-400" />
              <span className="text-sm font-bold tracking-wide text-zinc-100 uppercase">{profile.position || 'Not Specified'}</span>
            </div>
            <div className="flex-[1.5] flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer">
              <Ruler size={20} className="text-zinc-400" />
              <span className="text-sm font-bold tracking-wide text-zinc-100">
                {profile.height || 'N/A'} | {profile.weight || 'N/A'} | {profile.bodyType || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </main>

      <BottomNav active={isOwnProfile ? 'profile' : 'nearby'} />
    </div>
  );
};

const ConversationsList = ({ onSelectChat, activeChatId }: { onSelectChat?: (id: string) => void, activeChatId?: string | null }) => {
  const { user, setUnreadCount } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConversations = async () => {
      if (!user) return;
      setFetching(true);
      try {
        const data = await api.get('/api/conversations');
        setConversations(data);
        const unread = data.filter((c: any) => c.unread).length;
        setUnreadCount(unread);
      } catch (err) {
        console.error('Failed to fetch conversations:', err);
      } finally {
        setFetching(false);
      }
    };
    fetchConversations();
  }, [user]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="px-4">
      {fetching ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {conversations.map((conv) => (
            <button 
              key={conv.id}
              onClick={() => {
                if (onSelectChat) onSelectChat(conv.otherUser.id);
                else navigate(`/chat/${conv.otherUser.id}`);
              }}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-2xl text-left group transition-all",
                activeChatId === conv.otherUser.id ? "bg-zinc-900 border border-zinc-800" : "hover:bg-zinc-900/50"
              )}
            >
              <div className="relative">
                <div className={cn(
                  "w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center bg-zinc-900 border border-zinc-800"
                )}>
                  {conv.otherUser.profilePhotoThumbUrl || conv.otherUser.photoUrl ? (
                    <img src={conv.otherUser.profilePhotoThumbUrl || conv.otherUser.photoUrl} alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="text-zinc-700 font-black text-2xl italic">hia</div>
                  )}
                </div>
                {isOnline(conv.otherUser.lastSeen) && (
                  <div className="absolute -top-1 -left-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-black" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="font-bold text-sm truncate text-zinc-100">{conv.otherUser.distance || 'Nearby'}</h3>
                  <span className="text-[10px] text-zinc-500">
                    {conv.lastMessage ? formatTime(conv.lastMessage.createdAt) : formatTime(conv.updatedAt)}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-zinc-500 line-clamp-1 flex-1 leading-snug">
                    {conv.lastMessage?.content || 'No messages yet'}
                  </p>
                  {conv.unreadCount > 0 && (
                    <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-[9px] font-bold text-black shrink-0">
                      {conv.unreadCount}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
          {conversations.length === 0 && (
            <div className="text-center py-24 text-zinc-500 text-sm">
              No conversations yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ConversationsPage = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-full bg-black flex items-center justify-center text-white">Loading...</div>;
  if (!user) return <Navigate to="/" />;

  return (
    <div className="h-full bg-black text-white pb-20 font-display overflow-y-auto scrollbar-hide">
      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between sticky top-0 bg-black z-10 border-b border-zinc-900">
        <button className="p-2 text-white"><MoreHorizontal size={24} /></button>
        <h1 className="text-lg font-bold">All</h1>
        <div className="flex items-center gap-1">
          <button className="p-2 text-white bg-zinc-900 rounded-full"><SlidersHorizontal size={18} /></button>
          <button className="p-2 text-white bg-zinc-900 rounded-full"><ImageIcon size={18} /></button>
        </div>
      </header>

      {/* Conversations List */}
      <main className="py-4">
        <ConversationsList />
      </main>

      <BottomNav active="messages" />
    </div>
  );
};

const PhotoAlbumModal = ({ onClose, onUnlock, selectedPhotos, setSelectedPhotos }: { 
  onClose: () => void, 
  onUnlock: (count: number) => void,
  selectedPhotos: number[],
  setSelectedPhotos: React.Dispatch<React.SetStateAction<number[]>>
}) => {
  const photos = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const togglePhoto = (id: number) => {
    setSelectedPhotos(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col font-display"
    >
      <header className="p-4 flex items-center justify-between border-b border-zinc-900 bg-black sticky top-0 z-10">
        <button onClick={onClose} className="text-white hover:bg-zinc-900 p-2 rounded-xl transition-colors"><X size={24} /></button>
        <h2 className="font-black tracking-tight italic text-xl">Unlock Photos</h2>
        <button 
          onClick={() => onUnlock(selectedPhotos.length)}
          disabled={selectedPhotos.length === 0}
          className="bg-yellow-500 text-black px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-600 transition-all active:scale-95"
        >
          Unlock ({selectedPhotos.length})
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-2 bg-zinc-950">
        {photos.map(id => (
          <div 
            key={id} 
            onClick={() => togglePhoto(id)}
            className="relative aspect-square rounded-2xl overflow-hidden cursor-pointer group"
          >
            <img src={`https://picsum.photos/seed/photo${id}/300/300`} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
            <div className={cn(
              "absolute inset-0 flex items-center justify-center transition-all",
              selectedPhotos.includes(id) ? "bg-yellow-500/40" : "bg-black/40 group-hover:bg-black/20"
            )}>
              {selectedPhotos.includes(id) && (
                <div className="bg-yellow-500 text-black p-2 rounded-full shadow-lg animate-in zoom-in duration-300">
                  <Star size={24} fill="currentColor" />
                </div>
              )}
              {!selectedPhotos.includes(id) && (
                <Lock size={24} className="text-white/40 group-hover:text-white/80 transition-colors" />
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

const ChatWindow = ({ otherUserId, onBack, isSidebar }: { otherUserId: string, onBack?: () => void, isSidebar?: boolean }) => {
  const { user, loading } = useAuth();
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [fetching, setFetching] = useState(true);
  const [isMyGalleryUnlockedForThem, setIsMyGalleryUnlockedForThem] = useState(false);
  const [showPhotoAlbum, setShowPhotoAlbum] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<number[]>([]);
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initChat = async () => {
      if (!user || !otherUserId) return;
      try {
        const uData = await api.get(`/api/users/${otherUserId}`);
        setOtherUser(uData);
        setIsMyGalleryUnlockedForThem(uData.isMyGalleryUnlockedForThem);

        const convData = await api.get(`/api/conversations/user/${otherUserId}`);
        setConversation(convData);

        const msgData = await api.get(`/api/messages/${convData.id}`);
        setMessages(msgData);

        await api.post(`/api/messages/read/${convData.id}`, {});
      } catch (err) {
        console.error('Failed to initialize chat:', err);
      } finally {
        setFetching(false);
      }
    };
    initChat();
  }, [user?.id, otherUserId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversation) return;

    try {
      const msg = await api.post('/api/messages', {
        conversationId: conversation.id,
        senderId: user?.id,
        content: newMessage.trim()
      });
      setMessages([...messages, msg]);
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleUnlockPhotos = async (count: number) => {
    if (!otherUserId || count === 0) return;
    try {
      await api.post(`/api/users/${otherUserId}/unlock`, {});
      setIsMyGalleryUnlockedForThem(true);
      
      const msg = await api.post('/api/messages', {
        conversationId: conversation.id,
        senderId: user?.id,
        content: `🔓 I've unlocked ${count} private photo${count > 1 ? 's' : ''} for you!`
      });
      
      setMessages(prev => [...prev, msg]);
      setShowPhotoAlbum(false);
      setSelectedPhotos([]);
    } catch (err) {
      console.error('Failed to unlock photos:', err);
    }
  };

  if (loading || fetching) return <div className="h-full bg-black flex items-center justify-center text-white">Loading...</div>;
  if (!user || !otherUser) return <div className="h-full bg-black flex items-center justify-center text-zinc-500">User not found</div>;

  const online = isOnline(otherUser.lastSeen);
  const lastSeenText = formatLastSeen(otherUser.lastSeen);

  return (
    <div className="h-full bg-black text-white flex flex-col font-display">
      {/* Header */}
      <header className="px-4 py-3 flex items-center gap-3 border-b border-zinc-900 sticky top-0 bg-black z-10">
        {(onBack || !isSidebar) && (
          <button 
            onClick={() => onBack ? onBack() : navigate(-1)} 
            className="p-1 text-white hover:bg-zinc-900 rounded-xl transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        <div 
          onClick={() => navigate(`/profile/${otherUser.id}`)}
          className="flex items-center gap-3 cursor-pointer"
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-900 shadow-sm border border-zinc-800">
              {otherUser.profilePhotoThumbUrl || otherUser.photoUrl ? (
                <img src={otherUser.profilePhotoThumbUrl || otherUser.photoUrl} alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-700 font-bold italic">hia</div>
              )}
            </div>
            <div className={cn(
              "absolute -top-1 -left-1 w-3 h-3 rounded-full border-2 border-black shadow-sm",
              online ? "bg-emerald-500" : "bg-amber-400"
            )} />
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="text-sm font-black text-zinc-100 leading-none mb-1 truncate">
              {otherUser.displayName || 'User'}
            </h3>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                {online ? 'Online Now' : `Online ${lastSeenText || 'Recently'}`}
              </span>
              <span className="text-zinc-700 text-[10px]">•</span>
              <span className="text-[10px] text-zinc-500 font-medium">{otherUser.distance || 'Nearby'}</span>
            </div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button className="p-2 text-white"><Star size={18} /></button>
          <button className="p-2 text-white"><MoreHorizontal size={18} /></button>
        </div>
      </header>

      {/* Messages List */}
      <main 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-950"
      >
        {messages.map((msg) => {
          const isMe = msg.senderId === user.id;
          return (
            <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[80%] px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                isMe ? "bg-yellow-500 text-black rounded-tr-none" : "bg-zinc-900 text-zinc-100 rounded-tl-none border border-zinc-800"
              )}>
                {msg.content}
              </div>
            </div>
          );
        })}
      </main>

      {/* Input Field */}
      <footer className="p-4 border-t border-zinc-900 bg-black">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <button 
            type="button" 
            onClick={() => setShowPhotoAlbum(true)}
            className="p-2 text-zinc-600 hover:text-yellow-500 transition-colors"
          >
            <Plus size={24} />
          </button>
          <div className="flex-1 relative">
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-full px-5 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-yellow-500 transition-all"
            />
          </div>
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center text-black disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-600 transition-all"
          >
            <ArrowUp size={24} />
          </button>
        </form>
      </footer>

      {/* Photo Album Modal */}
      <AnimatePresence>
        {showPhotoAlbum && (
          <PhotoAlbumModal 
            onClose={() => setShowPhotoAlbum(false)} 
            onUnlock={handleUnlockPhotos}
            selectedPhotos={selectedPhotos}
            setSelectedPhotos={setSelectedPhotos}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const ChatPage = () => {
  const { otherUserId } = useParams();
  if (!otherUserId) return <Navigate to="/messages" />;
  return <ChatWindow otherUserId={otherUserId} />;
};

const BottomNav = ({ active }: { active: 'nearby' | 'messages' | 'profile' }) => {
  const navigate = useNavigate();
  const { user, unreadCount } = useAuth();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-zinc-900/90 backdrop-blur-xl border-t border-white/5 px-6 py-3 flex justify-around items-center z-50">
      <button 
        onClick={() => navigate('/home')}
        className={cn("flex flex-col items-center gap-1 transition-all duration-300", active === 'nearby' ? "text-yellow-500 scale-110" : "text-zinc-500 hover:text-white")}
      >
        <MapPin size={24} fill={active === 'nearby' ? "currentColor" : "none"} />
      </button>
      <button 
        onClick={() => navigate('/messages')}
        className={cn("flex flex-col items-center gap-1 transition-all duration-300 relative", active === 'messages' ? "text-yellow-500 scale-110" : "text-zinc-500 hover:text-white")}
      >
        <MessageSquare size={24} fill={active === 'messages' ? "currentColor" : "none"} />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full border-2 border-zinc-900 flex items-center justify-center text-[8px] font-bold text-black">
            {unreadCount}
          </div>
        )}
      </button>
      <button 
        onClick={() => navigate(`/profile/${user?.id}`)}
        className={cn("flex flex-col items-center gap-1 transition-all duration-300", active === 'profile' ? "text-yellow-500 scale-110" : "text-zinc-500 hover:text-white")}
      >
        {user?.profilePhotoThumbUrl || user?.photoUrl ? (
          <div className={cn("w-6 h-6 rounded-full overflow-hidden border-2 transition-all", active === 'profile' ? "border-yellow-500" : "border-transparent")}>
            <img src={user.profilePhotoThumbUrl || user.photoUrl} alt="Me" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
        ) : (
          <UserIcon size={24} />
        )}
      </button>
    </nav>
  );
};

const ProfileCard: React.FC<{ 
  user: User; 
  onOpenProfile: (u: User) => void; 
}> = ({ 
  user: u, 
  onOpenProfile 
}) => {
  const photos = u.photos && u.photos.length > 0 
    ? u.photos.map(p => p.photoData) 
    : [u.profilePhotoUrl || u.photoUrl || `https://picsum.photos/seed/user${u.id}/800/1000`];

  return (
    <motion.div 
      onClick={() => onOpenProfile(u)}
      className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-zinc-900 shadow-lg cursor-pointer group border border-zinc-800 transition-all duration-300 hover:border-yellow-500/50 hover:shadow-yellow-500/10"
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Image */}
      <img 
        src={photos[0]} 
        alt={u.displayName}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        referrerPolicy="no-referrer"
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

      {/* Info Panel - Only Distance | Age */}
      <div className="absolute bottom-0 inset-x-0 p-3 z-20 pointer-events-none">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className={cn(
              "w-2 h-2 rounded-full shrink-0",
              isOnline(u.lastSeen) ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-zinc-500"
            )} />
            <span className="text-[11px] font-black tracking-tight text-white truncate uppercase">
              {u.distance} | {u.age || '??'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const FullProfileOverlay = ({ 
  user: u, 
  onClose,
  onBlock,
  onFavorite
}: { 
  user: User, 
  onClose: () => void,
  onBlock: (u: User) => void,
  onFavorite: (u: User) => void
}) => {
  const navigate = useNavigate();
  const { setActiveDesktopChat } = useLayout();
  const [isFavorited, setIsFavorited] = useState(false);
  const [fullUser, setFullUser] = useState<User | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    const fetchFullProfile = async () => {
      try {
        const data = await api.get(`/api/users/${u.id}`);
        setFullUser(data);
        setIsFavorited(data.isFavorited);
      } catch (err) {
        console.error('Failed to fetch full profile:', err);
      }
    };
    fetchFullProfile();
  }, [u.id]);

  const handleFavorite = async () => {
    try {
      const res = await api.post(`/api/users/${u.id}/favorite`, {});
      setIsFavorited(res.favorited);
      onFavorite(u);
    } catch (err) {
      console.error('Failed to favorite:', err);
    }
  };

  const handleBlock = async () => {
    try {
      await api.post(`/api/users/${u.id}/block`, {});
      onBlock(u);
      onClose();
    } catch (err) {
      console.error('Failed to block:', err);
    }
  };

  const profile = fullUser || u;
  const photos = profile.photos && profile.photos.length > 0 
    ? profile.photos.map(p => p.photoData) 
    : [profile.profilePhotoUrl || profile.photoUrl || `https://picsum.photos/seed/user${profile.id}/800/1000`];

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/95 backdrop-blur-md z-[200] flex justify-center items-center font-display"
    >
      {/* Desktop Navigation Arrows */}
      {photos.length > 1 && (
        <>
          <button 
            onClick={prevPhoto}
            className="hidden lg:flex fixed left-8 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 items-center justify-center text-white transition-all z-[210]"
          >
            <ChevronLeft size={32} />
          </button>
          <button 
            onClick={nextPhoto}
            className="hidden lg:flex fixed right-8 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 items-center justify-center text-white transition-all z-[210]"
          >
            <ChevronRight size={32} />
          </button>
        </>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full h-full lg:h-[90vh] lg:max-w-md lg:rounded-[3rem] bg-black relative flex flex-col overflow-hidden shadow-2xl lg:border lg:border-zinc-800"
      >
        {/* Full Screen Background Image */}
        <div className="absolute inset-0" onClick={nextPhoto}>
          <AnimatePresence mode="wait">
            <motion.img 
              key={currentPhotoIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              src={photos[currentPhotoIndex]} 
              alt={profile.displayName}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80" />
        </div>

        {/* Top Header with Logo */}
        <div className="relative z-20 w-full p-6 pt-12 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex-1" />
          <div className="text-2xl font-black text-white/90 tracking-tighter italic">hia</div>
          <div className="flex-1 flex justify-end">
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-auto relative z-10 p-6 pb-10 space-y-4">
          {/* Pagination Dots */}
          {photos.length > 1 && (
            <div className="flex justify-center gap-1.5 mb-2">
              {photos.map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all",
                    i === currentPhotoIndex ? "bg-white w-3" : "bg-white/30"
                  )} 
                />
              ))}
            </div>
          )}

          {/* Age and Online Status */}
          <div className="px-2 space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-3xl filter drop-shadow-lg">✌️</span>
              <h1 className="text-4xl font-bold text-white drop-shadow-lg">
                {profile.age || '??'}
              </h1>
            </div>
            <div className="text-white/90 text-sm font-medium drop-shadow-md">
              Online {formatLastSeen(profile.lastSeen) || 'Now'} <span className="mx-1 opacity-50">|</span> <Send size={12} className="inline rotate-45 mr-1" /> {profile.distance} away
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Horizontal Info Bar */}
            <div className="flex-1 bg-zinc-900/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-3.5 flex items-center justify-between shadow-2xl">
              <div className="flex items-center gap-2 text-white/90 text-[13px] font-bold">
                <ArrowUpRight size={16} className="text-white" />
                <span>{profile.position || 'Vers Top'}</span>
              </div>

              <div className="w-px h-3 bg-white/10 mx-1" />

              <div className="flex items-center gap-2 text-white/90 text-[13px] font-bold">
                <Ruler size={16} className="text-white" />
                <span>{profile.height || "5'10\""} | {profile.weight || "160 lb"} | {profile.bodyType || "Toned"}</span>
              </div>
            </div>

            {/* Floating Chat Button & Quick Actions */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <div className="flex flex-col gap-2">
                <button 
                  onClick={handleFavorite}
                  className={cn(
                    "w-10 h-10 rounded-full backdrop-blur-xl border border-white/10 flex items-center justify-center transition-all shadow-lg",
                    isFavorited ? "bg-yellow-500 text-black" : "bg-white/5 text-white hover:bg-white/10"
                  )}
                >
                  <Heart size={18} fill={isFavorited ? "currentColor" : "none"} />
                </button>
                <button 
                  onClick={handleBlock}
                  className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/60 hover:text-red-500 hover:bg-white/10 transition-all shadow-lg"
                >
                  <Ban size={18} />
                </button>
              </div>

              <button 
                onClick={() => {
                  if (window.innerWidth >= 1280) { // xl breakpoint
                    setActiveDesktopChat(profile.id.toString());
                  } else {
                    navigate(`/chat/${profile.id}`);
                  }
                }}
                className="w-14 h-14 rounded-full bg-black border-[3px] border-zinc-900 flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 via-pink-500 to-orange-400 flex items-center justify-center relative overflow-hidden">
                  <MessageSquare size={18} fill="white" className="text-white" />
                  <div className="absolute inset-0 bg-white/20 opacity-0 hover:opacity-100 transition-opacity" />
                </div>
              </button>
            </div>
          </div>

          {/* Secondary Actions Row */}
          <div className="flex items-center justify-between px-2 pt-2">
            <div className="flex items-center gap-6">
              <button 
                onClick={handleFavorite}
                className={cn(
                  "flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] transition-all",
                  isFavorited ? "text-yellow-500" : "text-white/40 hover:text-white"
                )}
              >
                <Heart size={16} fill={isFavorited ? "currentColor" : "none"} />
                Like
              </button>
              <button 
                onClick={handleBlock}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-white/40 hover:text-red-500 transition-all"
              >
                <Ban size={16} />
                Block
              </button>
            </div>
            
            <button className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-white/50 transition-all">
              <Lock size={10} />
              Private Gallery
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const HomePage = () => {
  const { user, loading, updateLocation, retryingLocation } = useAuth();
  const [nearbyUsers, setNearbyUsers] = useState<User[]>([]);
  const [fetching, setFetching] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedProfile, setSelectedProfile] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      if (!user) return;
      const isInitialFetch = nearbyUsers.length === 0;
      if (isInitialFetch) setFetching(true);
      
      try {
        const data = await api.get('/api/users');
        let filtered = data.filter((u: User) => u.id !== user.id);
        
        // Filter by 10 mile radius
        filtered = filtered.filter((u: User) => (u.distanceValue || 0) <= 10);

        // Sort by online first, then distance
        filtered.sort((a: User, b: User) => {
          const aOnline = isOnline(a.lastSeen);
          const bOnline = isOnline(b.lastSeen);
          if (aOnline && !bOnline) return -1;
          if (!aOnline && bOnline) return 1;
          return (a.distanceValue || Infinity) - (b.distanceValue || Infinity);
        });

        setNearbyUsers(filtered.map((u: User) => ({
          ...u,
          distance: u.distance || 'Nearby',
          lastOnline: formatLastSeen(u.lastSeen) || 'Active Now',
          headline: u.lookingFor || 'Just Looking'
        })));
      } catch (err) {
        console.error('Failed to fetch users:', err);
      } finally {
        if (isInitialFetch) setFetching(false);
      }
    };
    fetchUsers();
  }, [user?.latitude, user?.longitude, user?.id]);

  if (loading) return <div className="h-full bg-black flex items-center justify-center text-white">Loading...</div>;
  if (!user) return <Navigate to="/" />;

  return (
    <div className="h-full bg-black text-white font-display overflow-hidden relative">
      {/* Header - Mobile Only */}
      <header className="p-4 flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur-md z-[100] border-b border-white/5 lg:hidden">
        <button className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer">
          <SlidersHorizontal size={22} />
        </button>
        
        <div className="text-2xl font-black tracking-tighter bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 text-transparent bg-clip-text font-display italic">
          hia
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={updateLocation}
            disabled={retryingLocation}
            className={cn(
              "p-2 transition-all active:scale-75",
              user.latitude ? "text-emerald-500" : "text-red-500"
            )}
          >
            <MapPin size={22} className={retryingLocation ? "animate-pulse" : ""} />
          </button>
          <button 
            onClick={() => navigate('/messages')}
            className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <MessageSquare size={22} />
          </button>
        </div>
      </header>

      {/* Profile Browser */}
      <main className="h-[calc(100%-140px)] lg:h-full overflow-y-auto scrollbar-hide p-3 lg:p-6">
        {fetching ? (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin" />
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Finding people...</p>
          </div>
        ) : nearbyUsers.length > 0 ? (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 lg:gap-4">
            {nearbyUsers.map((u) => (
              <ProfileCard 
                key={u.id} 
                user={u} 
                onOpenProfile={setSelectedProfile} 
              />
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 px-8">
            <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto text-zinc-700">
              <MapPin size={40} />
            </div>
            <h3 className="text-xl font-bold">No one nearby</h3>
            <p className="text-zinc-500 text-sm">Try expanding your filters or checking back later.</p>
          </div>
        )}
      </main>

      {/* Full Profile Overlay */}
      <AnimatePresence>
        {selectedProfile && (
          <FullProfileOverlay 
            user={selectedProfile} 
            onClose={() => setSelectedProfile(null)} 
            onBlock={(u) => {
              setNearbyUsers(prev => prev.filter(user => user.id !== u.id));
              if (currentIndex >= nearbyUsers.length - 1 && currentIndex > 0) {
                setCurrentIndex(prev => prev - 1);
              }
            }}
            onFavorite={() => {
              // Optionally update local state if needed
            }}
          />
        )}
      </AnimatePresence>

      <BottomNav active="nearby" />
    </div>
  );
};

// --- Provider ---

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [retryingLocation, setRetryingLocation] = useState(false);

  const updateLocation = async () => {
    setRetryingLocation(true);
    if (!("geolocation" in navigator)) {
      setLocationError("Geolocation not supported by your browser.");
      setRetryingLocation(false);
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    };

    return new Promise<void>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        setLocationError(null);
        try {
          const token = localStorage.getItem('hia_token');
          if (token) {
            await api.post('/api/users/location', { latitude, longitude });
            setUser(prev => prev ? { ...prev, latitude, longitude, lastSeen: new Date() } : null);
          } else {
            // Just update local state if not logged in yet
            setUser(prev => prev ? { ...prev, latitude, longitude } : null);
          }
          setRetryingLocation(false);
          resolve();
        } catch (err) {
          console.error('Failed to update location on server:', err);
          setRetryingLocation(false);
          resolve(); // Still resolve so we don't hang, but error is logged
        }
      }, (err) => {
        let msg = "Failed to get location.";
        if (err.code === 1) msg = "Location permission denied. Please enable it in your browser settings.";
        else if (err.code === 2) msg = "Location unavailable. Check your device settings.";
        else if (err.code === 3) msg = "Location request timed out.";
        
        // Specific check for permissions policy error
        if (err.message && err.message.includes("permissions policy")) {
          msg = "Geolocation is blocked by the browser's security policy for this preview. Please open the app in a new tab to use location features.";
        }
        
        console.error('Geolocation error:', msg, err);
        setLocationError(msg);
        setRetryingLocation(false);
        reject(new Error(msg));
      }, options);
    });
  };

  useEffect(() => {
    if (!user) return;
    
    if ("geolocation" in navigator) {
      const options = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      };

      let lastLat = user.latitude;
      let lastLng = user.longitude;

      const watchId = navigator.geolocation.watchPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Only update if moved more than 10 meters to prevent jitter/refreshing issues
        const distanceMoved = lastLat && lastLng ? calculateDistance(lastLat, lastLng, latitude, longitude) : 100;
        
        if (distanceMoved > 10) {
          lastLat = latitude;
          lastLng = longitude;
          setLocationError(null);
          try {
            await api.post('/api/users/location', { latitude, longitude });
            setUser(prev => prev ? { ...prev, latitude, longitude, lastSeen: new Date() } : null);
          } catch (err) {
            console.error('Failed to update location via watch:', err);
          }
        }
      }, (err) => {
        console.error('Geolocation watch error:', err.message);
        // Don't set global error for watch as it might be transient
      }, options);

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [user?.id]);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('hia_token');
      
      // Try to get location early
      updateLocation().catch(() => {});

      if (token) {
        try {
          const data = await api.get('/api/auth/me');
          setUser(data);
          // Update heartbeat immediately on auth
          api.post('/api/users/heartbeat', {}).catch(() => {});
          setUser(prev => prev ? { ...prev, lastSeen: new Date() } : null);
          
          // Initial unread count fetch
          const convs = await api.get('/api/conversations');
          const unread = convs.filter((c: any) => c.unread).length;
          setUnreadCount(unread);
        } catch (err) {
          console.error('Auth check failed:', err);
          localStorage.removeItem('hia_token');
          setUser(null);
        }
      }
      setLoading(false);
    };
    checkAuth();

    // Set up heartbeat and unread count interval
    const interval = setInterval(async () => {
      const token = localStorage.getItem('hia_token');
      if (token) {
        api.post('/api/users/heartbeat', {}).catch(() => {});
        setUser(prev => prev ? { ...prev, lastSeen: new Date() } : null);
        
        try {
          const convs = await api.get('/api/conversations');
          const unread = convs.filter((c: any) => c.unread).length;
          setUnreadCount(unread);
        } catch (err) {
          console.error('Failed to fetch unread count in interval:', err);
        }
      }
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await api.post('/api/auth/login', { email, password });
      localStorage.setItem('hia_token', data.token);
      setUser(data.user);
      updateLocation();
    } finally {
      setLoading(false);
    }
  };

  const register = async (formData: any) => {
    setLoading(true);
    try {
      const data = await api.post('/api/auth/register', formData);
      localStorage.setItem('hia_token', data.token);
      setUser(data.user);
      updateLocation();
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('hia_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, locationError, updateLocation, retryingLocation, login, register, logout, unreadCount, setUnreadCount }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- Layout Wrapper ---

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, unreadCount, updateLocation, retryingLocation } = useAuth();
  const { activeDesktopChat, setActiveDesktopChat } = useLayout();
  const location = useLocation();
  const navigate = useNavigate();

  // Hide layout for landing/auth pages
  const isAuthPage = ['/', '/login', '/register'].includes(location.pathname);

  if (isAuthPage) {
    return (
      <div className="h-[100dvh] w-full bg-[#050505] flex justify-center items-center overflow-hidden">
        <div className="w-full h-full max-w-[430px] sm:h-[88vh] sm:max-w-[410px] bg-black sm:rounded-[3.5rem] sm:shadow-[0_0_80px_-20px_rgba(0,0,0,0.8)] relative flex flex-col overflow-hidden border-zinc-900 sm:border-[12px] transform-gpu">
          {/* Notch Area */}
          <div className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-900 rounded-b-2xl z-[110]" />
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-[#050505] text-white font-display overflow-hidden flex">
      {/* Desktop Left Sidebar (Navigation) */}
      <aside className="hidden lg:flex flex-col w-20 border-r border-zinc-900 bg-black py-8 items-center shrink-0">
        <div 
          onClick={() => navigate('/home')}
          className="text-2xl font-black tracking-tighter bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 text-transparent bg-clip-text italic mb-12 cursor-pointer hover:scale-110 transition-transform"
          title="hia Home"
        >
          h
        </div>
        
        <nav className="space-y-4 flex-1 w-full px-2">
          {[
            { id: 'home', label: 'Nearby', icon: MapPin, path: '/home' },
            { id: 'filters', label: 'Filters', icon: SlidersHorizontal, action: () => {} },
            { id: 'location', label: 'Update Location', icon: Globe, action: updateLocation, loading: retryingLocation, color: user?.latitude ? "text-emerald-500" : "text-red-500" },
            { id: 'messages', label: 'Messages', icon: MessageSquare, path: '/messages', badge: unreadCount },
            { id: 'profile', label: 'My Profile', icon: UserIcon, path: `/profile/${user?.id}` },
            { id: 'settings', label: 'Settings', icon: Settings, path: '/edit-profile' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => item.path ? navigate(item.path) : item.action?.()}
              title={item.label}
              disabled={item.loading}
              className={cn(
                "w-full aspect-square flex items-center justify-center rounded-2xl transition-all group relative",
                item.path && location.pathname === item.path ? "bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]" : "text-zinc-500 hover:bg-zinc-900 hover:text-white",
                item.color && !item.path && item.color
              )}
            >
              <item.icon size={24} fill={item.path && location.pathname === item.path ? "currentColor" : "none"} className={cn(item.loading && "animate-pulse")} />
              {item.badge > 0 && (
                <span className={cn(
                  "absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-black border-2 border-black",
                  item.path && location.pathname === item.path ? "bg-black text-yellow-500" : "bg-yellow-500 text-black"
                )}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {user && (
          <div className="pt-6 border-t border-zinc-900 w-full flex justify-center">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 overflow-hidden border border-zinc-800 cursor-pointer hover:border-yellow-500 transition-colors" onClick={() => navigate(`/profile/${user.id}`)}>
              {user.profilePhotoThumbUrl || user.photoUrl ? (
                <img src={user.profilePhotoThumbUrl || user.photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-700 font-bold italic text-xs">hia</div>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-zinc-950">
        {/* Mobile View Wrapper (centered widget on small screens, full width on large) */}
        <div className="h-full w-full flex justify-center items-center lg:items-stretch lg:justify-start">
          <div className="w-full h-full lg:max-w-none max-w-[430px] sm:h-[88vh] lg:h-full sm:max-w-[410px] lg:max-w-none bg-black sm:rounded-[3.5rem] lg:rounded-none sm:shadow-[0_0_80px_-20px_rgba(0,0,0,0.8)] lg:shadow-none relative flex flex-col overflow-hidden border-zinc-900 sm:border-[12px] lg:border-0 transform-gpu">
            {/* Notch Area (Mobile only) */}
            <div className="hidden sm:block lg:hidden absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-900 rounded-b-2xl z-[110]" />
            {children}
          </div>
        </div>
      </main>

      {/* Desktop Right Sidebar (Messenger) */}
      <aside className="hidden xl:flex flex-col w-80 border-l border-zinc-900 bg-black shrink-0">
        {activeDesktopChat ? (
          <div className="flex-1 flex flex-col">
            <ChatWindow 
              otherUserId={activeDesktopChat} 
              onBack={() => setActiveDesktopChat(null)} 
              isSidebar 
            />
          </div>
        ) : (
          <>
            <header className="p-6 border-b border-zinc-900 flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-sm">
                  {user?.profilePhotoThumbUrl || user?.photoUrl ? (
                    <img src={user.profilePhotoThumbUrl || user.photoUrl} alt="Me" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700 font-bold italic">hia</div>
                  )}
                </div>
                <div className="absolute -top-1 -left-1 w-4 h-4 bg-emerald-500 rounded-full border-[3px] border-black shadow-sm" />
              </div>
              <div className="flex flex-col min-w-0">
                <h2 className="text-2xl font-black tracking-tight text-zinc-100 leading-none mb-1 truncate">
                  {user?.displayName || 'User'}
                </h2>
                <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
                  Online Now
                </span>
              </div>
              <button className="ml-auto p-2 text-zinc-400 hover:text-white transition-colors">
                <MoreHorizontal size={20} />
              </button>
            </header>
            
            <div className="flex-1 overflow-y-auto scrollbar-hide py-4">
              <ConversationsList onSelectChat={(id) => setActiveDesktopChat(id)} activeChatId={activeDesktopChat} />
            </div>
          </>
        )}
      </aside>

      {/* Far Right Sidebar (Google Ads) */}
      <aside className="hidden 2xl:flex flex-col w-64 border-l border-zinc-900 bg-black p-6 shrink-0">
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2 mb-6 opacity-40">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sponsored</span>
          </div>
          
          <div className="space-y-6">
            {/* Ad Placeholder 1 */}
            <div className="group cursor-pointer">
              <div className="aspect-[4/5] bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden mb-3 relative">
                <div className="absolute inset-0 flex items-center justify-center text-zinc-800 font-black text-4xl italic select-none">
                  AD
                </div>
                <img 
                  src="https://picsum.photos/seed/ad1/400/500" 
                  alt="Ad" 
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="px-2">
                <h4 className="text-xs font-bold text-zinc-200 mb-1 group-hover:text-yellow-500 transition-colors">Premium Gear for Pros</h4>
                <p className="text-[10px] text-zinc-500 leading-relaxed">Upgrade your setup with the latest technology. Limited time offer.</p>
              </div>
            </div>

            {/* Ad Placeholder 2 */}
            <div className="group cursor-pointer">
              <div className="aspect-[4/3] bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden mb-3 relative">
                <div className="absolute inset-0 flex items-center justify-center text-zinc-800 font-black text-4xl italic select-none">
                  AD
                </div>
                <img 
                  src="https://picsum.photos/seed/ad2/400/300" 
                  alt="Ad" 
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="px-2">
                <h4 className="text-xs font-bold text-zinc-200 mb-1 group-hover:text-yellow-500 transition-colors">Global Travel Deals</h4>
                <p className="text-[10px] text-zinc-500 leading-relaxed">Explore the world with exclusive discounts on flights and hotels.</p>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-zinc-900">
            <p className="text-[9px] text-zinc-600 leading-tight">
              Ads help us keep hia free. <br />
              <button className="text-zinc-400 hover:text-yellow-500 transition-colors mt-1 font-bold">Remove Ads with Premium</button>
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <LayoutProvider>
          <AppLayout>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/register" element={<RegisterFlow />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/messages" element={<ConversationsPage />} />
              <Route path="/chat/:otherUserId" element={<ChatPage />} />
              <Route path="/profile/:id" element={<ProfilePage />} />
              <Route path="/edit-profile" element={<EditProfilePage />} />
            </Routes>
          </AppLayout>
        </LayoutProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}

const LayoutProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeDesktopChat, setActiveDesktopChat] = useState<string | null>(null);
  return (
    <LayoutContext.Provider value={{ activeDesktopChat, setActiveDesktopChat }}>
      {children}
    </LayoutContext.Provider>
  );
};
