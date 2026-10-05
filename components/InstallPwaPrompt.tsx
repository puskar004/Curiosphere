"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone, X, Share, CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallPwaPrompt({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [downloadingApk, setDownloadingApk] = useState(false);

  useEffect(() => {
    // Check if running in standalone native/PWA mode
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch(() => {});
    }

    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleMobile = /iphone|ipad|ipod/.test(ua);
    const isAndroidDevice = /android/.test(ua);
    setIsIos(isAppleMobile);
    setIsAndroid(isAndroidDevice);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const handleQuickInstall = async () => {
    if (isIos) {
      setShowModal(true);
      return;
    }

    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        setShowModal(false);
      }
      setDeferredPrompt(null);
    } else {
      setShowModal(true);
    }
  };

  const handleDownloadApk = () => {
    setDownloadingApk(true);
    const link = document.createElement("a");
    link.href = "/api/download-apk";
    link.download = "CurioSphere.apk";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloadingApk(false);
    }, 3000);
  };

  if (isInstalled) return null;

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={() => setShowModal(true)}
          title="Install Mobile App or Download APK"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-sm hover:from-indigo-700 hover:to-violet-700 transition active:scale-95 touch-manipulation",
            className
          )}
        >
          <Smartphone className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline font-semibold">📱 App / APK</span>
          <span className="sm:hidden font-semibold">APK</span>
        </button>
      ) : (
        <div
          className={cn(
            "rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-4 sm:p-5 text-white shadow-xl",
            className
          )}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-white">
                    CurioSphere Mobile App
                  </span>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                    Android APK + PWA
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-300">
                  Phone ke liye smooth scrolling, responsive fonts aur 1-tap fast loading ke saath install karein.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              <button
                type="button"
                onClick={handleDownloadApk}
                className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-bold text-white shadow-md transition active:scale-95 touch-manipulation"
              >
                <Download className="h-3.5 w-3.5 shrink-0" />
                <span>{downloadingApk ? "Downloading APK…" : "Download APK"}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-bold text-white shadow-md transition active:scale-95 touch-manipulation"
              >
                <Zap className="h-3.5 w-3.5 shrink-0" />
                <span>Install Guide</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Install & APK Download Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-3.5 sm:p-4 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-slate-700/80 bg-slate-900 p-5 sm:p-6 text-white shadow-2xl max-h-[92dvh] overflow-y-auto overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  📱
                </span>
                <div>
                  <h3 className="text-sm font-black text-white">Install CurioSphere App</h3>
                  <p className="text-[11px] text-slate-400">
                    {isAndroid ? "Android Phone Edition" : isIos ? "iOS / iPhone Edition" : "Mobile & Desktop"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Android / Universal APK Section */}
            <div className="mt-4 space-y-3.5">
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🤖</span>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-300">Option 1: Direct Android APK</h4>
                      <p className="text-[10px] text-slate-400">CurioSphere.apk (Direct install on Android)</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-300 border border-emerald-500/30">
                    Recommended
                  </span>
                </div>

                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleDownloadApk}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 py-2.5 px-3 text-xs font-bold text-white shadow-md transition active:scale-95 touch-manipulation"
                  >
                    <Download className="h-4 w-4" />
                    <span>{downloadingApk ? "Downloading CurioSphere.apk…" : "📥 Download APK (.apk file)"}</span>
                  </button>
                </div>

                <div className="mt-2.5 space-y-1.5 text-[11px] text-slate-300 pl-1">
                  <div className="flex items-start gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Download hone ke baad notification me <strong>&ldquo;Open&rdquo;</strong> dabayein.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>&ldquo;Install&rdquo;</strong> pe click karein (Unknown sources allow karein agar puche).</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>App bina kisi browser bar ke full-screen phone me chalegi!</span>
                  </div>
                </div>
              </div>

              {/* Option 2: 1-Tap Quick WebAPK / PWA Install */}
              <div className="rounded-2xl border border-indigo-500/30 bg-slate-800/60 p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⚡</span>
                    <div>
                      <h4 className="text-xs font-bold text-indigo-300">Option 2: 1-Tap Quick Install (WebAPK)</h4>
                      <p className="text-[10px] text-slate-400">Chrome / Edge instant home screen install</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleQuickInstall}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2.5 px-3 text-xs font-bold text-white shadow-md transition active:scale-95 touch-manipulation"
                  >
                    <Smartphone className="h-4 w-4" />
                    <span>Quick Install on Home Screen</span>
                  </button>
                </div>
              </div>

              {/* iOS Instructions if on iPhone/iPad */}
              {isIos && (
                <div className="rounded-2xl border border-violet-500/30 bg-violet-950/30 p-3.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🍏</span>
                    <h4 className="text-xs font-bold text-violet-300">iPhone / iPad Safari Install</h4>
                  </div>
                  <div className="mt-2.5 space-y-2 text-xs text-slate-300">
                    <div className="flex items-start gap-2 rounded-xl bg-slate-800/80 p-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-violet-600 text-[10px] font-bold text-white">
                        1
                      </span>
                      <p className="text-[11px]">
                        Safari browser me neeche <strong>Share</strong> button <Share className="inline h-3.5 w-3.5 text-violet-400" /> dabayein.
                      </p>
                    </div>
                    <div className="flex items-start gap-2 rounded-xl bg-slate-800/80 p-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-violet-600 text-[10px] font-bold text-white">
                        2
                      </span>
                      <p className="text-[11px]">
                        Menu me scroll karke <strong>&ldquo;Add to Home Screen&rdquo;</strong> (होम स्क्रीन में जोड़ें) chunein.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Feature highlight */}
              <div className="flex items-center justify-between rounded-xl bg-slate-800/40 px-3 py-2 text-[10px] text-slate-400 border border-slate-700/50">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Safe & verified for education
                </span>
                <span>Version 1.0.0</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="mt-4 w-full rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
