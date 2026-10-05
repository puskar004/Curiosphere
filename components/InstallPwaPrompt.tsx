"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone, X, Share } from "lucide-react";
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
  const [showIosModal, setShowIosModal] = useState(false);

  useEffect(() => {
    // Check if already running in standalone PWA mode
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

    // Check if iOS device
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleMobile = /iphone|ipad|ipod/.test(ua);
    setIsIos(isAppleMobile);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosModal(true);
      return;
    }

    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowIosModal(true);
    }
  };

  if (isInstalled) return null;

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={handleInstallClick}
          title="Install CurioSphere Mobile App"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-600 to-violet-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-sm hover:from-indigo-700 hover:to-violet-700 transition",
            className
          )}
        >
          <Smartphone className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Install App</span>
        </button>

        {showIosModal && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4"
            onClick={() => setShowIosModal(false)}
          >
            <div
              className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    📱
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-white">Install Mobile App</h3>
                    <p className="text-[11px] text-slate-400">Add to your Home Screen</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIosModal(false)}
                  className="rounded-xl p-1 text-slate-400 hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-slate-300">
                <div className="flex items-start gap-2.5 rounded-2xl bg-slate-800/80 p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
                    1
                  </span>
                  <p>
                    Tap the <strong>Share</strong> button <Share className="inline h-3.5 w-3.5 text-indigo-400" /> in your browser menu (bottom of Safari / top of Chrome).
                  </p>
                </div>
                <div className="flex items-start gap-2.5 rounded-2xl bg-slate-800/80 p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
                    2
                  </span>
                  <p>
                    Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong> (होम स्क्रीन में जोड़ें).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIosModal(false)}
                className="mt-5 w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 p-4 text-white shadow-lg",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">
              Install CurioSphere Mobile App
            </div>
            <p className="text-[11px] text-slate-400">
              Access coding labs, notes, and classes with fast 1-tap app launch on your phone.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleInstallClick}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-500 transition"
        >
          <Download className="h-3.5 w-3.5" />
          Install App
        </button>
      </div>

      {showIosModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowIosModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  📱
                </span>
                <div>
                  <h3 className="text-sm font-black text-white">Install Mobile App</h3>
                  <p className="text-[11px] text-slate-400">Add to your Home Screen</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIosModal(false)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-300">
              <div className="flex items-start gap-2.5 rounded-2xl bg-slate-800/80 p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
                  1
                </span>
                <p>
                  Tap the <strong>Share</strong> button <Share className="inline h-3.5 w-3.5 text-indigo-400" /> in Safari or Chrome.
                </p>
              </div>
              <div className="flex items-start gap-2.5 rounded-2xl bg-slate-800/80 p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
                  2
                </span>
                <p>
                  Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong> (होम स्क्रीन में जोड़ें).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosModal(false)}
              className="mt-5 w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
}
