"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AuroraText } from "@/components/magicui/aurora-text";
import { SparklesText } from "@/components/magicui/sparkles-text";
import { Button } from "@/components/ui/button";

// Lazy load Spline to improve initial page load
const LazySpline = lazy(() => import("@splinetool/react-spline"));

export function Hero() {
  const [showSpline, setShowSpline] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    // Don't show on mobile
    if (!isMobile) {
      const timer = setTimeout(() => {
        setShowSpline(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isMobile]);

  return (
    <section id="hero" className="relative">
      <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-x-8 w-full p-6 lg:p-12 border-x overflow-hidden">
        <div className="flex flex-col justify-start items-start lg:col-span-1">
          {/* New pill */}
          <motion.a
            href="#features"
            className="flex w-auto items-center space-x-2 rounded-full bg-primary/20 px-2 py-1 ring-1 ring-accent whitespace-pre"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="w-fit rounded-full bg-accent px-2 py-0.5 text-left text-xs font-medium text-primary sm:text-sm">
              🚀 New
            </div>
            <p className="text-xs font-medium text-primary sm:text-sm">
              Introducing MCP Compatibility
            </p>
            <svg
              width="12"
              height="12"
              className="ml-1"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8.78141 5.33312L5.20541 1.75712L6.14808 0.814453L11.3334 5.99979L6.14808 11.1851L5.20541 10.2425L8.78141 6.66645H0.666748V5.33312H8.78141Z"
                fill="currentColor"
              />
            </svg>
          </motion.a>
          
          {/* Title and description */}
          <div className="flex w-full max-w-3xl flex-col overflow-hidden pt-8">
            <motion.h1
              className="text-left text-4xl font-semibold leading-tighter sm:text-5xl md:text-6xl tracking-tighter"
              initial={{ filter: "blur(10px)", opacity: 0, y: 50 }}
              animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
              transition={{
                duration: 1,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <motion.span
                className="inline-block text-balance"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.8,
                  delay: 0.5,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <AuroraText 
                  className="leading-normal"
                  colors={["#FF0080", "#7928CA", "#0070F3", "#38bdf8"]}
                >
                  Plugged.in - The Crossroads for AI
                </AuroraText>
              </motion.span>
            </motion.h1>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.6,
                duration: 0.8,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="mt-4"
            >
              <SparklesText
                text="Manage all your MCP servers in one place"
                className="text-xl font-medium text-muted-foreground"
                sparklesCount={15}
                colors={{ first: '#A07CFE', second: '#FE8FB5' }}
              />
            </motion.div>
          </div>
          
          {/* Call to action buttons */}
          <div className="relative mt-8">
            <motion.div
              className="flex w-full max-w-2xl flex-col items-start justify-start space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <Button asChild>
                <Link href="/setup-guide">
                  {t('landing.gettingStarted.action')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link 
                  href="https://github.com/VeriTeknik/pluggedin-app" 
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on GitHub
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
        
        {/* Spline animation */}
        {!isMobile && (
          <div className="relative lg:h-full lg:col-span-1">
            <Suspense fallback={<div className="w-full h-[400px] flex items-center justify-center">Loading 3D animation...</div>}>
              {showSpline && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 1 }}
                >
                  <LazySpline
                    scene="https://prod.spline.design/mZBrYNcnoESGlTUG/scene.splinecode"
                    className="absolute inset-0 w-full h-full origin-top-left flex items-center justify-center"
                  />
                </motion.div>
              )}
            </Suspense>
          </div>
        )}
      </div>
    </section>
  );
}
