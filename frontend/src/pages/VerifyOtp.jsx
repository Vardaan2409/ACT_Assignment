import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Smartphone,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  LayoutDashboard,
  Loader2,
} from 'lucide-react';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30; // seconds

const VerifyOtp = () => {
  const { verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // State passed from Register or Login pages
  const { phone, purpose = 'phone_verify', dev_otp, expiresIn = 600 } =
    location.state || {};

  const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Countdown: OTP expiry
  const [timeLeft, setTimeLeft] = useState(expiresIn);
  // Resend cooldown
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);

  const inputRefs = useRef([]);

  // Auto-redirect if no phone in state
  useEffect(() => {
    if (!phone) navigate('/login', { replace: true });
  }, [phone, navigate]);

  // OTP expiry countdown
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Auto-focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) inputRefs.current[0].focus();
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleDigitChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // only digits

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1); // take last char (handles paste edge cases)
    setOtpDigits(newDigits);
    setError('');

    // Move focus forward
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits filled
    if (newDigits.every((d) => d !== '') && newDigits.join('').length === OTP_LENGTH) {
      handleVerify(newDigits.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      const newDigits = [...otpDigits];
      newDigits[index] = '';
      setOtpDigits(newDigits);
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle paste into any digit input
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const newDigits = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((ch, i) => { newDigits[i] = ch; });
    setOtpDigits(newDigits);
    const nextEmpty = pasted.length < OTP_LENGTH ? pasted.length : OTP_LENGTH - 1;
    inputRefs.current[nextEmpty]?.focus();

    if (pasted.length === OTP_LENGTH) {
      handleVerify(pasted);
    }
  };

  const handleVerify = useCallback(async (code) => {
    const otp = code || otpDigits.join('');
    if (otp.length < OTP_LENGTH) {
      setError('Please enter the complete 6-digit OTP.');
      return;
    }

    setIsVerifying(true);
    setError('');

    const result = await verifyOtp(phone, otp, purpose);
    setIsVerifying(false);

    if (result.success) {
      setSuccess('Phone verified successfully! Redirecting…');
      setTimeout(() => navigate('/dashboard', { replace: true }), 1200);
    } else {
      setError(result.message || 'Verification failed.');
      // Clear inputs on wrong OTP so user can re-enter
      if (!result.expired) {
        setOtpDigits(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      }
      if (result.expired) {
        setTimeLeft(0);
      }
    }
  }, [otpDigits, phone, purpose, verifyOtp, navigate]);

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setIsResending(true);
    setError('');
    setOtpDigits(Array(OTP_LENGTH).fill(''));
    inputRefs.current[0]?.focus();

    const result = await resendOtp(phone, purpose);
    setIsResending(false);

    if (result.success) {
      setTimeLeft(result.expiresIn || 600);
      setResendCooldown(RESEND_COOLDOWN);
      setSuccess('A new OTP has been sent to your phone.');
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.message || 'Failed to resend OTP.');
    }
  };

  const maskedPhone = phone
    ? `+91 XXXXXX${phone.replace(/\D/g, '').slice(-4)}`
    : '';

  const isExpired = timeLeft <= 0;
  const progressPct = ((expiresIn - timeLeft) / expiresIn) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50/30 p-4">
      <div className="max-w-md w-full">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-200 mb-5">
            <Smartphone className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Verify Your Phone
          </h1>
          <p className="mt-2 text-slate-500 font-medium text-sm">
            Enter the 6-digit OTP sent to
          </p>
          <p className="mt-1 text-indigo-600 font-black text-base">{maskedPhone}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 p-8 space-y-6">

          {/* Dev-mode OTP hint */}
          {dev_otp && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start space-x-3">
              <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Development Mode — Mock SMS</p>
                <p className="text-sm font-mono font-black text-amber-900 mt-0.5 tracking-widest">
                  OTP: {dev_otp}
                </p>
              </div>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-3 rounded-2xl flex items-center space-x-3 text-sm">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span className="font-semibold">{success}</span>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl flex items-center space-x-3 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Expiry bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-slate-500">OTP expires in</span>
              <span className={`font-black tabular-nums ${isExpired ? 'text-red-500' : timeLeft < 60 ? 'text-amber-600' : 'text-indigo-600'}`}>
                {isExpired ? 'Expired' : formatTime(timeLeft)}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                style={{ width: `${Math.min(progressPct, 100)}%` }}
                className={`h-full transition-all duration-1000 rounded-full ${
                  isExpired ? 'bg-red-400' : timeLeft < 60 ? 'bg-amber-400' : 'bg-indigo-500'
                }`}
              />
            </div>
          </div>

          {/* OTP Digit Inputs */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-3 text-center">
              Enter verification code
            </label>
            <div className="flex justify-center space-x-3" onPaste={handlePaste}>
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-input-${index}`}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={1}
                  value={digit}
                  disabled={isExpired || isVerifying || !!success}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={`
                    w-12 h-14 text-center text-2xl font-black rounded-2xl border-2 transition-all duration-200
                    focus:outline-none focus:scale-105
                    ${digit ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100' : 'border-slate-200 bg-slate-50 text-slate-900'}
                    ${isExpired ? 'opacity-40 cursor-not-allowed' : 'hover:border-indigo-300'}
                    ${success ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : ''}
                    focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100
                  `}
                />
              ))}
            </div>
          </div>

          {/* Verify Button */}
          <button
            onClick={() => handleVerify()}
            disabled={isVerifying || isExpired || !!success || otpDigits.join('').length < OTP_LENGTH}
            className="w-full flex justify-center items-center space-x-2.5 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-2xl text-base font-bold transition-all shadow-lg shadow-indigo-200 active:scale-[0.98]"
          >
            {isVerifying ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : success ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <ShieldCheck className="w-5 h-5" />
            )}
            <span>
              {isVerifying ? 'Verifying…' : success ? 'Verified!' : 'Verify OTP'}
            </span>
          </button>

          {/* Resend section */}
          <div className="text-center space-y-1">
            <p className="text-sm text-slate-500 font-medium">Didn't receive the code?</p>
            {resendCooldown > 0 && !isExpired ? (
              <p className="text-sm font-bold text-slate-400">
                Resend available in{' '}
                <span className="text-indigo-600 tabular-nums">{resendCooldown}s</span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={isResending || !!success}
                className="inline-flex items-center space-x-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-700 disabled:opacity-50 transition-colors"
              >
                {isResending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span>{isResending ? 'Sending…' : 'Resend OTP'}</span>
              </button>
            )}
          </div>

          {/* Back link */}
          <div className="pt-2 border-t border-slate-100 text-center">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center space-x-1.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;
