import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, MapPin, ShieldCheck, Flame, Award, Clock, Users, Wrench } from 'lucide-react';
import { BusinessSettings } from '../types.ts';

interface AboutUsPageProps {
  settings: BusinessSettings;
  onBack: () => void;
}

export const AboutUsPage: React.FC<AboutUsPageProps> = ({ settings, onBack }) => {
  // Animated counters for luxury statistics
  const [bhattisCount, setBhattisCount] = useState(0);
  const [yearsCount, setYearsCount] = useState(0);
  const [clientsCount, setClientsCount] = useState(0);

  useEffect(() => {
    let bhattiTimer = setInterval(() => {
      setBhattisCount((prev) => (prev < 25000 ? prev + 450 : 25000));
    }, 30);

    let yearsTimer = setInterval(() => {
      setYearsCount((prev) => (prev < 24 ? prev + 1 : 24));
    }, 80);

    let clientsTimer = setInterval(() => {
      setClientsCount((prev) => (prev < 15000 ? prev + 250 : 15000));
    }, 40);

    return () => {
      clearInterval(bhattiTimer);
      clearInterval(yearsTimer);
      clearInterval(clientsTimer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white px-4 sm:px-8 py-8 sm:py-12 selection:bg-white selection:text-black">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Catalogue</span>
          </button>
          <div className="text-xs font-mono tracking-widest uppercase text-zinc-400">
            Heritage &amp; Craftsmanship Since 2000
          </div>
        </div>

        {/* Hero Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-amber-400 text-xs font-mono uppercase tracking-wider"
          >
            <Flame className="w-4 h-4" />
            <span>{settings.businessName || 'Sonu Diesel Bhatti'}</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-6xl font-black tracking-tight uppercase leading-none font-sans"
          >
            Mastering Industrial <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Heating &amp; Stoves</span>
          </motion.h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed font-medium">
            Furnaces and stoves (bhattis) engineered for heavy commercial cooking, renowned dhabas, large halwai functions, and rigorous industrial heating across India.
          </p>
        </div>

        {/* Full Image Showcase matching attached storefront */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative rounded-[2.5rem] overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl group"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10" />
          <img
            src="/assets/aistudio/1794425000347_3cba4b42.png"
            alt="Sonu Diesel Bhatti Storefront"
            className="w-full h-[450px] sm:h-[650px] object-cover group-hover:scale-102 transition-transform duration-700 filter brightness-95"
          />
          <div className="absolute bottom-8 left-8 right-8 z-20 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
                Original Storefront &amp; Workshop
              </span>
              <h3 className="text-2xl sm:text-4xl font-black tracking-tight text-white mt-1">
                Shri Sonu Diesel Bhatti
              </h3>
            </div>
            <a
              href="https://share.google/1Y5drNjBSzo1T8QJN"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-black hover:bg-zinc-200 text-xs font-extrabold uppercase tracking-wider transition-all shadow-xl cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-red-600 fill-current" />
              <span>Open Google Maps Location</span>
            </a>
          </div>
        </motion.div>

        {/* Moving Luxury Numbers / Statistics Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-8 border-y border-zinc-800">
          <div className="text-center sm:text-left p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md">
            <div className="text-4xl sm:text-6xl font-black text-white font-mono tracking-tighter">
              {bhattisCount.toLocaleString()}+
            </div>
            <div className="text-xs uppercase font-bold text-amber-400 tracking-widest mt-2">
              Bhattis &amp; Furnaces Delivered
            </div>
            <p className="text-xs text-zinc-400 mt-1">Robust steel burners built to last decades.</p>
          </div>

          <div className="text-center sm:text-left p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md">
            <div className="text-4xl sm:text-6xl font-black text-white font-mono tracking-tighter">
              {yearsCount} <span className="text-2xl text-amber-400">Years</span>
            </div>
            <div className="text-xs uppercase font-bold text-amber-400 tracking-widest mt-2">
              Generations of Expertise
            </div>
            <p className="text-xs text-zinc-400 mt-1">Manufacturing since 2000 with trust.</p>
          </div>

          <div className="text-center sm:text-left p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md">
            <div className="text-4xl sm:text-6xl font-black text-white font-mono tracking-tighter">
              {clientsCount.toLocaleString()}+
            </div>
            <div className="text-xs uppercase font-bold text-amber-400 tracking-widest mt-2">
              Satisfied Kitchens &amp; Dhabas
            </div>
            <p className="text-xs text-zinc-400 mt-1">Halwai functions, hotels &amp; mandir bhattis.</p>
          </div>
        </div>

        {/* Detailed Craftsmanship Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-800 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">Heavy Industrial Grade</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Designed specifically for continuous high-temperature commercial cooking and dhabas with zero downtime.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-800 flex items-center justify-center text-amber-400">
              <Wrench className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">Custom Sizes &amp; Burners</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              From compact 11x11 bhattis to 32-inch counter bhattis, double-burners, and custom multi-ring industrial bhattis.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-800 flex items-center justify-center text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">Halwai &amp; Wedding Trusted</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              The #1 choice for catering families, grand banquets, wedding feasts, and community langar bhattis.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-800 flex items-center justify-center text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">Direct Workshop Pricing</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Transparent pricing with direct WhatsApp order verification and direct delivery coordination.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center pt-8 border-t border-zinc-800 pb-16 space-y-2">
          <p className="text-xs text-zinc-500 font-mono">
            सोनू डीजल भट्टी • ਸੋਨੂੰ ਡੀਜ਼ਲ ਭੱਠੀ • Commercial Cooking Furnaces &amp; Stoves
          </p>
          <p className="text-[11px] text-zinc-600">
            &copy; {new Date().getFullYear()} Sonu Diesel Bhatti. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};
