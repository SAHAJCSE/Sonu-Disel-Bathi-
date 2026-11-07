import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  X,
  ExternalLink,
  CheckCircle2,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';
import { useTranslation } from '../i18n/LanguageContext.tsx';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { t } = useTranslation();
  const [showApkGuide, setShowApkGuide] = useState(false);

  // Default production app URL
  const appUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://ais-pre-ifjud2aksmpnwoduosa6vy-338460284693.europe-west1.run.app';

  const pwabuilderUrl = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(
    appUrl
  )}`;

  const handleClick = () => {
    if (isInstallable) {
      install().then((success) => {
        if (!success) {
          setShowApkGuide(true);
        }
      });
    } else {
      setShowApkGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 transition-all cursor-pointer shadow-xs active:scale-95 whitespace-nowrap shrink-0"
      >
        <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
        <span>Android App / APK</span>
      </button>

      {/* APK & Android Installation Modal */}
      {showApkGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-lg rounded-3xl bg-[#1c1c1e] text-white p-5 sm:p-7 shadow-2xl border border-zinc-800 ring-1 ring-white/10 overflow-hidden space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                  <Package className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <span>Android APK & Installation</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/30">
                      v1.2 Active
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Sonu Diesel Bhatti — Official Android Deployment
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowApkGuide(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Methods */}
            <div className="space-y-3.5 text-xs">
              {/* Method 1: Instant Native WebAPK (Recommended on Phone) */}
              <div className="p-4 rounded-2xl bg-[#232326] border border-zinc-700/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black flex items-center justify-center border border-emerald-500/30">
                      1
                    </span>
                    <span>Instant Native Android Installation (WebAPK)</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00C1FD]/20 text-[#00C1FD] font-bold border border-[#00C1FD]/30">
                    Recommended
                  </span>
                </div>
                <p className="text-zinc-300 leading-relaxed text-[11px]">
                  When opened on your Android phone in Google Chrome, Android automatically builds and installs a standalone native APK with an app icon in your app drawer, offline database access, and push notifications.
                </p>
                {isInstallable ? (
                  <button
                    type="button"
                    onClick={() => {
                      install();
                      setShowApkGuide(false);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-[0.98] cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install WebAPK Now</span>
                  </button>
                ) : (
                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
                    <p className="font-semibold text-zinc-200">On your Android phone:</p>
                    <p>1. Open this link in Google Chrome: <strong className="text-white font-mono">{appUrl}</strong></p>
                    <p>2. Tap the Chrome menu (<strong className="text-white">⋮</strong>) at top-right.</p>
                    <p>3. Tap <strong className="text-emerald-400">Install app</strong> or <strong className="text-emerald-400">Add to Home Screen</strong>.</p>
                  </div>
                )}
              </div>

              {/* Method 2: Direct Downloadable .apk via PWABuilder */}
              <div className="p-4 rounded-2xl bg-[#232326] border border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-300 text-xs font-black flex items-center justify-center border border-zinc-700">
                      2
                    </span>
                    <span>Download Signed .APK File (PWABuilder)</span>
                  </span>
                </div>
                <p className="text-zinc-300 leading-relaxed text-[11px]">
                  Generate a signed, downloadable standalone <strong className="text-white">.apk</strong> file (or Google Play Store package) using Microsoft and Google's official PWA packaging engine.
                </p>
                <a
                  href={pwabuilderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#EDEDED] hover:bg-white text-zinc-950 font-bold text-xs inline-flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-[0.98]"
                >
                  <Package className="w-4 h-4 text-zinc-900" />
                  <span>Generate & Download APK on PWABuilder</span>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-600" />
                </a>
              </div>

              {/* Method 3: CLI Bubblewrap */}
              <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800/80 space-y-1.5">
                <span className="font-mono text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#00C1FD]" />
                  <span>Developer CLI Command (Google Bubblewrap):</span>
                </span>
                <pre className="p-2.5 rounded-lg bg-black/60 text-[10px] font-mono text-emerald-400 overflow-x-auto border border-zinc-800">
{`npx @bubblewrap/cli init --manifest=${appUrl}/manifest.webmanifest
npx @bubblewrap/cli build`}
                </pre>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 flex items-center justify-between border-t border-zinc-800 text-[11px] text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>PWA & WebAPK Verified</span>
              </span>
              <button
                type="button"
                onClick={() => setShowApkGuide(false)}
                className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
