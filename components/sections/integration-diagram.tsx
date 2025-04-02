"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";

import { AuroraText } from "@/components/magicui/aurora-text";
import { AnimatedBeam } from "@/components/magicui/animated-beam";

export function IntegrationDiagram() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.3 });
  
  // Refs for the components
  const appRef = useRef<HTMLDivElement>(null);
  const mcpRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const promptsRef = useRef<HTMLDivElement>(null);
  const resourcesRef = useRef<HTMLDivElement>(null);
  
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section ref={sectionRef} className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <AuroraText 
            className="text-3xl font-bold mb-4"
            colors={["#FF0080", "#7928CA", "#0070F3", "#38bdf8"]}
          >
            Seamless Integration
          </AuroraText>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            See how pluggedin-app and pluggedin-mcp work together to provide a unified interface for all your MCP needs.
          </p>
        </div>
        
        <div 
          ref={containerRef} 
          className="relative h-[600px] w-full max-w-4xl mx-auto"
        >
          {/* Main components */}
          <motion.div
            ref={appRef}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="absolute top-1/2 left-1/4 transform -translate-x-1/2 -translate-y-1/2 bg-card rounded-lg p-6 shadow-lg w-64 text-center"
          >
            <div className="text-2xl mb-2">🖥️</div>
            <h3 className="text-xl font-semibold mb-2">pluggedin-app</h3>
            <p className="text-sm text-muted-foreground">Web application for managing MCP servers</p>
          </motion.div>
          
          <motion.div
            ref={mcpRef}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="absolute top-1/2 right-1/4 transform translate-x-1/2 -translate-y-1/2 bg-card rounded-lg p-6 shadow-lg w-64 text-center"
          >
            <div className="text-2xl mb-2">🔌</div>
            <h3 className="text-xl font-semibold mb-2">pluggedin-mcp</h3>
            <p className="text-sm text-muted-foreground">MCP proxy server for routing requests</p>
          </motion.div>
          
          <motion.div
            ref={clientRef}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="absolute top-1/4 right-1/4 transform translate-x-1/2 -translate-y-1/2 bg-card rounded-lg p-6 shadow-lg w-64 text-center"
          >
            <div className="text-2xl mb-2">👤</div>
            <h3 className="text-xl font-semibold mb-2">MCP Clients</h3>
            <p className="text-sm text-muted-foreground">Claude, Cursor, Cline, etc.</p>
          </motion.div>
          
          {/* Sub components */}
          <motion.div
            ref={toolsRef}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="absolute bottom-1/4 left-1/4 transform -translate-x-1/2 translate-y-1/2 bg-card rounded-lg p-4 shadow-lg w-48 text-center"
          >
            <div className="text-xl mb-1">🛠️</div>
            <h4 className="text-lg font-semibold mb-1">Tools</h4>
            <p className="text-xs text-muted-foreground">Discovered and managed</p>
          </motion.div>
          
          <motion.div
            ref={promptsRef}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="absolute bottom-1/4 transform translate-y-1/2 bg-card rounded-lg p-4 shadow-lg w-48 text-center"
          >
            <div className="text-xl mb-1">💬</div>
            <h4 className="text-lg font-semibold mb-1">Prompts</h4>
            <p className="text-xs text-muted-foreground">Custom instructions</p>
          </motion.div>
          
          <motion.div
            ref={resourcesRef}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="absolute bottom-1/4 right-1/4 transform translate-x-1/2 translate-y-1/2 bg-card rounded-lg p-4 shadow-lg w-48 text-center"
          >
            <div className="text-xl mb-1">📦</div>
            <h4 className="text-lg font-semibold mb-1">Resources</h4>
            <p className="text-xs text-muted-foreground">Templates and files</p>
          </motion.div>
          
          {/* AnimatedBeam connections - only render when components are mounted and in view */}
          
          {/* Simple diagram with lines */}
          <div className="absolute inset-0 w-full h-full">
            <svg className="w-full h-full" viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* App to MCP */}
              <line x1="150" y1="200" x2="450" y2="200" stroke="url(#gradient1)" strokeWidth="2" />
              
              {/* MCP to Client */}
              <line x1="450" y1="200" x2="450" y2="100" stroke="url(#gradient2)" strokeWidth="2" />
              
              {/* App to Tools */}
              <line x1="150" y1="200" x2="150" y2="450" stroke="url(#gradient3)" strokeWidth="2" />
              
              {/* App to Prompts */}
              <line x1="150" y1="200" x2="300" y2="450" stroke="url(#gradient4)" strokeWidth="2" />
              
              {/* App to Resources */}
              <line x1="150" y1="200" x2="450" y2="450" stroke="url(#gradient5)" strokeWidth="2" />
              
              {/* MCP to Tools */}
              <line x1="450" y1="200" x2="150" y2="450" stroke="url(#gradient6)" strokeWidth="2" />
              
              {/* MCP to Prompts */}
              <line x1="450" y1="200" x2="300" y2="450" stroke="url(#gradient7)" strokeWidth="2" />
              
              {/* MCP to Resources */}
              <line x1="450" y1="200" x2="450" y2="450" stroke="url(#gradient8)" strokeWidth="2" />
              
              {/* Gradients */}
              <defs>
                <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
                <linearGradient id="gradient2" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
                <linearGradient id="gradient3" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
                <linearGradient id="gradient4" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
                <linearGradient id="gradient5" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
                <linearGradient id="gradient6" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
                <linearGradient id="gradient7" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
                <linearGradient id="gradient8" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
