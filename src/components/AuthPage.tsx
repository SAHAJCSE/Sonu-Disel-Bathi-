import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export const AuthPage: React.FC<{ onAuthSuccess: (role: 'guest' | 'user' | 'admin') => void }> = ({ onAuthSuccess }) => {
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');

  return (
    <div className="fixed inset-0 z-40 bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl border border-zinc-100 dark:border-zinc-800"
      >
        <h2 className="text-2xl font-black text-zinc-950 dark:text-zinc-50 mb-6">
          {step === 'mobile' ? 'Sign In' : 'Enter OTP'}
        </h2>

        {step === 'mobile' ? (
          <div className="space-y-4">
            <input
              type="tel"
              placeholder="Mobile Number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-950 dark:text-zinc-50"
            />
            <button
              onClick={() => setStep('otp')}
              className="w-full py-4 rounded-xl bg-emerald-600 text-white font-bold"
            >
              Continue
            </button>
            <button
              onClick={() => onAuthSuccess('guest')}
              className="w-full py-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 font-bold"
            >
              Continue as Guest
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-950 dark:text-zinc-50"
            />
            <button
              onClick={() => {
                if (otp === '1234') onAuthSuccess('user');
                else alert('Invalid OTP');
              }}
              className="w-full py-4 rounded-xl bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-950 font-bold"
            >
              Verify
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
