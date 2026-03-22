import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Link, Navigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, Mail, Lock, Eye, EyeOff, Camera, LogOut, 
  User as UserIcon, Settings, MapPin, MessageSquare, Heart,
  Star, ArrowUpRight, Ruler, Clock, Globe, MoreHorizontal,
  Weight as WeightIcon, Target, ArrowUp, ArrowUpRight as VersTop, ArrowUpDown, ArrowDownRight as VersBottom, ArrowDown, MoveHorizontal, X, Search
} from 'lucide-react';
import { cn } from './lib/utils';
import { api } from './lib/api';

// --- Types & Context ---

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
  distance?: string;
  headline?: string;
  bio?: string;
  ethnicity?: string;
  height?: string;
  weight?: string;
  bodyType?: string;
  relationshipStatus?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {}
});

const useAuth = () => useContext(AuthContext);

// --- Constants ---

const STATS_OPTIONS = [
  { id: 'lookingFor', label: 'Looking for', icon: Search, choices: ['Hookups', 'Friends', 'Relationship', 'Right Now', 'Chat'] },
  { id: 'age', label: 'Age', icon: Clock, choices: Array.from({ length: 82 }, (_, i) => (i + 18).toString()) },
  { id: 'ethnicity', label: 'Ethnicity', icon: Globe, choices: ['Asian', 'Black', 'Latino', 'Middle Eastern', 'Mixed', 'Other', 'South Asian', 'White'] },
  { id: 'height', label: 'Height', icon: Ruler, choices: ['4\' 0"', '4\' 1"', '4\' 2"', '4\' 3"', '4\' 4"', '4\' 5"', '4\' 6"', '4\' 7"', '4\' 8"', '4\' 9"', '4\' 10"', '4\' 11"', '5\' 0"', '5\' 1"', '5\' 2"', '5\' 3"', '5\' 4"', '5\' 5"', '5\' 6"', '5\' 7"', '5\' 8"', '5\' 9"', '5\' 10"', '5\' 11"', '6\' 0"', '6\' 1"', '6\' 2"', '6\' 3"', '6\' 4"', '6\' 5"', '6\' 6"', '6\' 7"', '6\' 8"', '6\' 9"', '6\' 10"', '6\' 11"', '7\' 0"'] },
  { id: 'weight', label: 'Weight', icon: WeightIcon, choices: Array.from({ length: 201 }, (_, i) => (i + 100).toString() + ' lb') },
  { id: 'position', label: 'Position', icon: Target, choices: [
    { label: 'Top', icon: ArrowUp },
    { label: 'Vers Top', icon: VersTop },
    { label: 'Versatile', icon: ArrowUpDown },
    { label: 'Vers Bottom', icon: VersBottom },
    { label: 'Bottom', icon: ArrowDown },
    { label: 'Side', icon: MoveHorizontal },
    { label: 'Not Specified', icon: X },
  ]},
  { id: 'bodyType', label: 'Body Type', icon: UserIcon, choices: ['Slim', 'Average', 'Athletic', 'Muscular', 'Large', 'Extra Large'] },
  { id: 'relationshipStatus', label: 'Relationship Status', icon: Heart, choices: ['Single', 'Committed', 'Dating', 'Disclosed', 'Married', 'Open Relationship'] },
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
    primary: 'bg-orange-600 hover:bg-orange-700 text-white disabled:bg-orange-800',
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
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-orange-500 transition-colors">
        {Icon && <Icon size={20} />}
      </div>
      <input
        ref={ref}
        type={inputType}
        className={cn(
          "w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-4 pl-12 pr-12 text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all",
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
          i + 1 <= step ? "bg-orange-500 w-4" : "bg-zinc-800"
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
        className="fixed inset-x-0 bottom-0 bg-[#f2f2f7] text-black rounded-t-[1.5rem] z-[100] flex flex-col max-h-[80vh] shadow-2xl pb-safe"
      >
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-white rounded-t-[1.5rem]">
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-900">
            <X size={20} />
          </button>
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onSave} className="text-orange-600 font-bold text-lg px-2">
            Save
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-8 relative bg-white">
          {/* Selection Highlight */}
          <div className="absolute top-1/2 left-0 right-0 h-12 bg-zinc-100 -translate-y-1/2 pointer-events-none mx-4 rounded-xl" />
          
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
                    isSelected ? "text-zinc-900 font-bold scale-110" : "text-zinc-400 font-medium"
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
    <div className="min-h-screen bg-[#1a0b2e] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden font-display">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-600/20 blur-[120px] rounded-full" />
      
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-32 relative"
      >
        <h1 className="text-9xl font-black tracking-tighter drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] bg-gradient-to-br from-[#8b5cf6] via-[#ec4899] to-[#f97316] text-transparent bg-clip-text font-display">
          hia
        </h1>
        <div className="absolute -inset-4 bg-white/5 blur-2xl rounded-full -z-10" />
      </motion.div>
      
      <div className="w-full max-w-sm space-y-6 relative z-10">
        <Button 
          onClick={() => navigate('/register')}
          className="bg-gradient-to-r from-yellow-400 via-orange-500 to-orange-600 text-zinc-900 font-bold text-lg shadow-[0_0_30px_rgba(249,115,22,0.3)] hover:shadow-[0_0_40px_rgba(249,115,22,0.5)] border-none"
        >
          Create an Account
        </Button>
        <p className="text-white/60 font-medium text-sm">
          Already have an account? <Link to="/login" className="text-orange-500 hover:text-orange-400 transition-colors font-bold">Log in</Link>
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
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 font-display">
      <div className="w-full max-w-md">
        <h2 className="text-4xl font-bold text-white mb-8 text-center">Welcome back</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <Input icon={Mail} placeholder="Email" type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} required />
          <Input icon={Lock} placeholder="Password" type="password" value={password} onChange={(e: any) => setPassword(e.target.value)} required />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <Button type="submit" loading={loading}>Log In</Button>
        </form>
        <p className="text-center mt-8 text-zinc-500">
          Don't have an account? <Link to="/register" className="text-orange-500 font-semibold hover:underline">Sign up</Link>
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
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden selection:bg-orange-500/30 font-display">
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
                Already have an account? <Link to="/login" className="text-orange-500 font-semibold hover:underline">Log in</Link>
              </p>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6">
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

          {step === 3 && (
            <motion.div key="s3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8">
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
                    className="w-20 bg-zinc-900/50 border border-zinc-800 rounded-xl py-4 text-center text-xl text-white focus:border-orange-500 outline-none transition-all" 
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
                    className="w-20 bg-zinc-900/50 border border-zinc-800 rounded-xl py-4 text-center text-xl text-white focus:border-orange-500 outline-none transition-all" 
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
                    className="w-28 bg-zinc-900/50 border border-zinc-800 rounded-xl py-4 text-center text-xl text-white focus:border-orange-500 outline-none transition-all" 
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
                  className={cn("w-12 h-6 rounded-full relative cursor-pointer transition-colors", formData.showAge ? "bg-orange-500" : "bg-zinc-700")}
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
                          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
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

  if (loading || !formData) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;
  if (!user) return <Navigate to="/" />;

  return (
    <div className="min-h-screen bg-[#f2f2f7] text-black font-display pb-20">
      <header className="bg-white px-4 py-3 flex items-center justify-between border-b border-zinc-200 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-orange-600 font-medium text-lg">Cancel</button>
        <h1 className="text-lg font-bold">Edit Profile</h1>
        <button onClick={handleSave} disabled={saving} className="text-orange-600 font-bold text-lg">
          {saving ? '...' : 'Save'}
        </button>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        <section className="bg-white rounded-2xl overflow-hidden border border-zinc-200">
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold">Show distance</p>
              <p className="text-zinc-500 text-xs">Show distance on your profile</p>
            </div>
            <div 
              onClick={() => setFormData({...formData, showDistance: !formData.showDistance})}
              className={cn("w-12 h-6 rounded-full relative cursor-pointer transition-colors", formData.showDistance ? "bg-orange-500" : "bg-zinc-300")}
            >
              <motion.div animate={{ x: formData.showDistance ? 24 : 4 }} className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-bold text-zinc-500 uppercase px-4 tracking-widest">Attributes</h3>
          <div className="bg-white rounded-2xl overflow-hidden border border-zinc-200">
            {STATS_OPTIONS.map((opt, idx) => (
              <button
                key={opt.id}
                onClick={() => {
                  setActiveSelection(opt.id);
                  setTempValue((formData as any)[opt.id] || '');
                }}
                className={cn(
                  "w-full p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors text-left",
                  idx !== STATS_OPTIONS.length - 1 && "border-b border-zinc-100"
                )}
              >
                <span className="text-lg font-medium">{opt.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 font-medium">
                    {(formData as any)[opt.id] || '--'}
                  </span>
                  <ChevronLeft size={18} className="rotate-180 text-zinc-300" />
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
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await api.get(`/api/users/${id}`);
        // Add mock data for missing fields to match design
        setProfile({
          ...data,
          lastOnline: data.lastOnline || '11 minutes ago',
          distance: data.distance || '581 mi away',
          headline: data.headline || 'Just Looking',
          bio: data.bio || "I love nothing more then to chill and relax when I'm not working.",
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
  }, [id]);

  if (loading || fetching) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;
  if (!user) return <Navigate to="/" />;
  if (!profile) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Profile not found</div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-24 font-display">
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-20">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-black/20 backdrop-blur-sm text-white hover:bg-black/40 transition-colors">
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-2">
          {user.id === profile.id && (
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
          <div className="aspect-[1/1.1] w-full bg-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5">
            <img 
              src={profile.profilePhotoUrl || profile.photoUrl || `https://picsum.photos/seed/user${profile.id}/800/1000`} 
              alt={profile.displayName} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            
            {/* Floating Action Buttons */}
            <div className="absolute bottom-6 right-10 flex flex-col gap-3">
              <button className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-orange-500 shadow-xl active:scale-90 transition-transform">
                <Star size={28} fill="currentColor" />
              </button>
              <button className="w-14 h-14 rounded-full bg-orange-600 flex items-center justify-center text-white shadow-xl active:scale-90 transition-transform">
                <MessageSquare size={28} fill="currentColor" />
              </button>
            </div>

            {/* Pagination Dots (Visual only) */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className={cn("w-2 h-2 rounded-full", i === 1 ? "bg-white" : "bg-white/40")} />
              ))}
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="px-8 pt-6 space-y-5">
          {/* Status Line */}
          <div className="flex items-center gap-4 text-sm font-medium text-zinc-300">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span>Online {profile.lastOnline}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe size={16} className="text-zinc-500" />
              <span>{profile.distance}</span>
            </div>
          </div>

          {/* Headline & Bio */}
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white leading-tight">
              {profile.headline} <span className="font-normal text-zinc-500 mx-1">|</span> {profile.bio}
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

      {/* Bottom Nav (Consistent with Home) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#050505] border-t border-zinc-900 px-6 py-3 flex justify-around items-center z-20">
        <button onClick={() => navigate('/home')} className="flex flex-col items-center gap-1 text-zinc-500 hover:text-white transition-colors">
          <MapPin size={24} />
          <span className="text-[9px] font-bold uppercase tracking-tighter">Nearby</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-zinc-500 hover:text-white transition-colors">
          <MessageSquare size={24} />
          <span className="text-[9px] font-bold uppercase tracking-tighter">Messages</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-zinc-500 hover:text-white transition-colors">
          <UserIcon size={24} />
          <span className="text-[9px] font-bold uppercase tracking-tighter">Profile</span>
        </button>
      </nav>
    </div>
  );
};

const ProfileCard = ({ u, navigate }: { u: User, navigate: any, key?: any }) => {
  const [lastTap, setLastTap] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const hintTimeout = useRef<any>(null);

  const handleInteraction = () => {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    
    if (!isMobile) {
      navigate(`/profile/${u.id}`);
      return;
    }

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTap < DOUBLE_TAP_DELAY) {
      // Double tap detected
      if (hintTimeout.current) clearTimeout(hintTimeout.current);
      setShowHint(false);
      navigate(`/profile/${u.id}`);
    } else {
      // First tap
      setLastTap(now);
      setShowHint(true);
      if (hintTimeout.current) clearTimeout(hintTimeout.current);
      hintTimeout.current = setTimeout(() => setShowHint(false), 1500);
    }
  };

  return (
    <div 
      onClick={handleInteraction}
      className="aspect-[3/4] bg-zinc-950 relative group cursor-pointer overflow-hidden"
    >
      <img 
        src={u.profilePhotoThumbUrl || u.photoUrl || `https://picsum.photos/seed/user${u.id}/400/500`} 
        alt={u.displayName} 
        className="w-full h-full object-cover transition-transform duration-500 group-active:scale-105" 
        referrerPolicy="no-referrer" 
      />
      
      {/* Online Indicator */}
      <div className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full border border-black shadow-[0_0_8px_rgba(34,197,94,0.8)]" />

      {/* Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm px-2 py-1.5 text-[10px] sm:text-xs font-medium border-t border-white/5">
        <span className="truncate block text-zinc-200">
          {u.position || 'Nearby'} | {u.age || '??'}
        </span>
      </div>

      {/* Mobile Double Tap Hint */}
      <AnimatePresence>
        {showHint && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none"
          >
            <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 text-[10px] font-bold uppercase tracking-widest">
              Tap again to open
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const HomePage = () => {
  const { user, loading, logout } = useAuth();
  const [nearbyUsers, setNearbyUsers] = useState<User[]>([]);
  const [fetching, setFetching] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      if (!user) return;
      setFetching(true);
      try {
        const data = await api.get('/api/users');
        setNearbyUsers(data.filter((u: User) => u.id !== user.id));
      } catch (err) {
        console.error('Failed to fetch users:', err);
      } finally {
        setFetching(false);
      }
    };
    fetchUsers();
  }, [user]);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;
  if (!user) return <Navigate to="/" />;

  return (
    <div className="min-h-screen bg-black text-white pb-20 font-display">
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-zinc-900 sticky top-0 bg-black z-10">
        <div className="text-xl font-black tracking-tighter bg-gradient-to-br from-[#8b5cf6] via-[#ec4899] to-[#f97316] text-transparent bg-clip-text font-display italic">
          hia
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-zinc-400 hover:text-white transition-colors"><Settings size={20} /></button>
          <button onClick={logout} className="p-2 text-zinc-400 hover:text-red-500 transition-colors"><LogOut size={20} /></button>
        </div>
      </header>

      {/* Main Content - Grid Layout */}
      <main>
        {fetching ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-[1px] bg-zinc-900">
            {nearbyUsers.map((u) => (
              <ProfileCard key={u.id} u={u} navigate={navigate} />
            ))}
            {nearbyUsers.length === 0 && (
              <div className="col-span-3 text-center py-24 text-zinc-500">
                No nearby profiles found.
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-900 px-6 py-3 flex justify-around items-center z-20">
        <button className="flex flex-col items-center gap-1 text-orange-500">
          <MapPin size={24} />
          <span className="text-[9px] font-bold uppercase tracking-tighter">Nearby</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-zinc-500 hover:text-white transition-colors">
          <MessageSquare size={24} />
          <span className="text-[9px] font-bold uppercase tracking-tighter">Messages</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-zinc-500 hover:text-white transition-colors">
          <UserIcon size={24} />
          <span className="text-[9px] font-bold uppercase tracking-tighter">Profile</span>
        </button>
      </nav>
    </div>
  );
};

// --- Provider ---

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('hia_token');
      if (token) {
        try {
          const data = await api.get('/api/auth/me');
          setUser(data);
        } catch (err) {
          console.error('Auth check failed:', err);
          localStorage.removeItem('hia_token');
          setUser(null);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await api.post('/api/auth/login', { email, password });
      localStorage.setItem('hia_token', data.token);
      setUser(data.user);
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
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('hia_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<RegisterFlow />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/profile/:id" element={<ProfilePage />} />
          <Route path="/edit-profile" element={<EditProfilePage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
