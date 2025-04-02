"use client";

import { motion } from "framer-motion";
import { useRef } from "react";
import { useInView } from "framer-motion";

import { Terminal } from "@/components/magicui/terminal";
import { Safari } from "@/components/magicui/safari";
import { ScriptCopyBtn } from "@/components/magicui/script-copy-btn";
import { AnimatedBeam } from "@/components/magicui/animated-beam";
import { SparklesText } from "@/components/magicui/sparkles-text";

export function TechnicalShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.3 });
  
  // Refs for the components
  const terminalRef = useRef<HTMLDivElement>(null);
  const safariRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLDivElement>(null);
  
  return (
    <section ref={sectionRef} className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <SparklesText
            text="Technical Showcase"
            className="text-3xl font-bold mb-4"
            sparklesCount={20}
            colors={{ first: '#A07CFE', second: '#FE8FB5' }}
          />
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Explore the technical capabilities of Plugged.in with our interactive components and tools.
          </p>
        </div>
        
        <div ref={containerRef} className="relative">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
            <motion.div
              ref={terminalRef}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="flex flex-col"
            >
              <h3 className="text-xl font-semibold mb-4">Terminal Interface</h3>
              <p className="text-muted-foreground mb-4">
                Our terminal interface provides a powerful way to interact with MCP servers directly.
                Debug, test, and explore your tools with ease.
              </p>
              <Terminal className="w-full">
                <div className="text-green-400">
                  {'>'}npx -y @pluggedin/mcp-proxy@latest --pluggedin-api-key YOUR_API_KEY
                </div>
                <div className="text-white">
                  ✓ Connecting to plugged.in API
                  ✓ Fetching server configurations
                  ✓ Discovering MCP tools
                  ✓ Starting proxy server
                  ✓ Ready! MCP proxy is now running on port 3000
                </div>
              </Terminal>
            </motion.div>
            
            <motion.div
              ref={safariRef}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col"
            >
              <h3 className="text-xl font-semibold mb-4">Dashboard Interface</h3>
              <p className="text-muted-foreground mb-4">
                Our intuitive dashboard makes it easy to manage your MCP servers and discover their capabilities.
                Visualize your tools, resources, and prompts in one place.
              </p>
              <div className="bg-card rounded-lg p-6 shadow-lg">
                <div className="w-full h-64 bg-muted rounded-md flex items-center justify-center">
                  <p className="text-muted-foreground">Dashboard Interface</p>
                </div>
              </div>
            </motion.div>
          </div>
          
          <motion.div
            ref={scriptRef}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="max-w-3xl mx-auto"
          >
            <h3 className="text-xl font-semibold mb-4 text-center">Quick Installation</h3>
            <p className="text-muted-foreground mb-6 text-center">
              Get started with Plugged.in in seconds with our simple installation command.
              Works with npm, yarn, pnpm, and bun.
            </p>
            <ScriptCopyBtn
              showMultiplePackageOptions={true}
              codeLanguage="shell"
              commandMap={{
                npm: "npx @pluggedin/mcp-proxy@latest --pluggedin-api-key YOUR_API_KEY",
                yarn: "yarn dlx @pluggedin/mcp-proxy@latest --pluggedin-api-key YOUR_API_KEY",
                pnpm: "pnpm dlx @pluggedin/mcp-proxy@latest --pluggedin-api-key YOUR_API_KEY",
                bun: "bunx @pluggedin/mcp-proxy@latest --pluggedin-api-key YOUR_API_KEY"
              }}
              className="w-full"
              lightTheme="github-light"
              darkTheme="github-dark"
            />
          </motion.div>
          
          {/* AnimatedBeam connections */}
          {isInView && (
            <>
              <AnimatedBeam
                containerRef={containerRef}
                fromRef={terminalRef}
                toRef={safariRef}
                curvature={0.3}
                duration={3}
                pathColor="gray"
                pathWidth={2}
                pathOpacity={0.2}
                gradientStartColor="#3b82f6"
                gradientStopColor="#8b5cf6"
              />
              
              <AnimatedBeam
                containerRef={containerRef}
                fromRef={safariRef}
                toRef={scriptRef}
                curvature={0.3}
                duration={3}
                pathColor="gray"
                pathWidth={2}
                pathOpacity={0.2}
                gradientStartColor="#8b5cf6"
                gradientStopColor="#ec4899"
                startYOffset={20}
                endYOffset={-20}
              />
              
              <AnimatedBeam
                containerRef={containerRef}
                fromRef={terminalRef}
                toRef={scriptRef}
                curvature={-0.3}
                duration={3}
                pathColor="gray"
                pathWidth={2}
                pathOpacity={0.2}
                gradientStartColor="#3b82f6"
                gradientStopColor="#ec4899"
                startYOffset={20}
                endYOffset={-20}
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
