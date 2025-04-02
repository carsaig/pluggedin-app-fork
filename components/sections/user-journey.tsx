"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";

import { HyperText } from "@/components/magicui/hyper-text";
import { AuroraText } from "@/components/magicui/aurora-text";
import { SparklesText } from "@/components/magicui/sparkles-text";
import { AnimatedBeam } from "@/components/magicui/animated-beam";
import { Terminal } from "@/components/magicui/terminal";
import { Safari } from "@/components/magicui/safari";
import { ScriptCopyBtn } from "@/components/magicui/script-copy-btn";

export function UserJourney() {
  // Container ref for AnimatedBeam
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Step refs for AnimatedBeam connections
  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const step4Ref = useRef<HTMLDivElement>(null);
  const step5Ref = useRef<HTMLDivElement>(null);
  
  // InView refs for animations
  const section1Ref = useRef<HTMLDivElement>(null);
  const section2Ref = useRef<HTMLDivElement>(null);
  const section3Ref = useRef<HTMLDivElement>(null);
  const section4Ref = useRef<HTMLDivElement>(null);
  const section5Ref = useRef<HTMLDivElement>(null);
  
  const isSection1InView = useInView(section1Ref, { once: true, amount: 0.5 });
  const isSection2InView = useInView(section2Ref, { once: true, amount: 0.5 });
  const isSection3InView = useInView(section3Ref, { once: true, amount: 0.5 });
  const isSection4InView = useInView(section4Ref, { once: true, amount: 0.5 });
  const isSection5InView = useInView(section5Ref, { once: true, amount: 0.5 });

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-16">How It Works</h2>
        
        <div ref={containerRef} className="relative">
          {/* Step 1: Create Collections */}
          <div 
            ref={section1Ref}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24"
          >
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={isSection1InView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8 }}
              className="flex flex-col justify-center"
            >
              <div className="text-4xl font-bold mb-2">1</div>
              <div ref={step1Ref}>
                <HyperText
                  className="text-2xl font-semibold mb-4"
                  duration={800}
                  as="h3"
                  startOnView={true}
                  animateOnHover={true}
                >
                  Create collections for Claude Desktop, Cursor, or Cline
                </HyperText>
              </div>
              <p className="text-muted-foreground">
                Organize your MCP servers into collections based on different clients or use cases.
                Keep your workspace clean and efficient.
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={isSection1InView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="bg-card rounded-lg p-6 shadow-lg"
            >
              <div className="w-full h-64 bg-muted rounded-md flex items-center justify-center">
                <p className="text-muted-foreground">Collections Interface</p>
              </div>
            </motion.div>
          </div>
          
          {/* Step 2: Collect & Import MCP Servers */}
          <div 
            ref={section2Ref}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24"
          >
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={isSection2InView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8 }}
              className="flex flex-col justify-center order-2 md:order-1"
            >
              <div className="bg-card rounded-lg p-6 shadow-lg">
                <div className="w-full h-64 bg-muted rounded-md flex items-center justify-center">
                  <p className="text-muted-foreground">Server Import Interface</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={isSection2InView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex flex-col justify-center order-1 md:order-2"
            >
              <div className="text-4xl font-bold mb-2">2</div>
              <div ref={step2Ref}>
                <AuroraText 
                  className="text-2xl font-semibold mb-4"
                  colors={["#FF0080", "#7928CA", "#0070F3", "#38bdf8"]}
                >
                  Collect your favorite MCP servers or directly import them
                </AuroraText>
              </div>
              <p className="text-muted-foreground">
                Add your favorite MCP servers to your collections or import existing ones with just a few clicks.
                Discover new MCP servers from our growing ecosystem.
              </p>
            </motion.div>
          </div>
          
          {/* Step 3: Discover Capabilities */}
          <div 
            ref={section3Ref}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24"
          >
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={isSection3InView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8 }}
              className="flex flex-col justify-center"
            >
              <div className="text-4xl font-bold mb-2">3</div>
              <div ref={step3Ref}>
                <SparklesText
                  text="Make a discovery and see the details"
                  className="text-2xl font-semibold mb-4"
                  sparklesCount={15}
                  colors={{ first: '#A07CFE', second: '#FE8FB5' }}
                />
              </div>
              <p className="text-muted-foreground">
                Run discovery to see all available tools, resources, and prompts.
                Explore detailed information about each server's capabilities.
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={isSection3InView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="bg-card rounded-lg p-6 shadow-lg"
            >
              <div className="bg-card rounded-lg p-6 shadow-lg">
                <div className="w-full h-64 bg-muted rounded-md flex items-center justify-center">
                  <p className="text-muted-foreground">Discovery Interface</p>
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* Step 4: Debug with Playground */}
          <div 
            ref={section4Ref}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24"
          >
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={isSection4InView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8 }}
              className="flex flex-col justify-center order-2 md:order-1"
            >
              <Terminal className="w-full">
                <div className="text-green-400">
                  {'>'}Testing github_create_issue tool
                </div>
                <div className="text-white">
                  ✓ Tool schema validated
                  ✓ Required parameters: title, body, repo
                  ✓ Optional parameters: labels, assignees
                  ✓ Testing with sample parameters...
                  ✓ Tool execution successful
                  ✓ Response: Issue #42 created successfully
                </div>
                <div className="text-green-400 mt-2">
                  {'>'}Testing openai_generate tool
                </div>
                <div className="text-white">
                  ✓ Tool schema validated
                  ✓ Required parameters: prompt
                  ✓ Optional parameters: model, max_tokens
                  ✓ Testing with sample parameters...
                  ✓ Tool execution successful
                  ✓ Response: Generated text received (256 tokens)
                </div>
              </Terminal>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={isSection4InView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex flex-col justify-center order-1 md:order-2"
            >
              <div className="text-4xl font-bold mb-2">4</div>
              <div ref={step4Ref}>
                <HyperText
                  className="text-2xl font-semibold mb-4"
                  duration={800}
                  as="h3"
                  startOnView={true}
                  animateOnHover={true}
                >
                  If you are building MCP Servers you can use the Playground for extensive debugging
                </HyperText>
              </div>
              <p className="text-muted-foreground">
                Use our extensive Playground for debugging if you're building MCP Servers.
                Test tools and resources in real-time and optimize your MCP server performance.
              </p>
            </motion.div>
          </div>
          
          {/* Step 5: Connect to Clients */}
          <div 
            ref={section5Ref}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={isSection5InView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8 }}
              className="flex flex-col justify-center"
            >
              <div className="text-4xl font-bold mb-2">5</div>
              <div ref={step5Ref}>
                <AuroraText 
                  className="text-2xl font-semibold mb-4"
                  colors={["#FF0080", "#7928CA", "#0070F3", "#38bdf8"]}
                >
                  Install pluggedin MCP Proxy to your favorite client
                </AuroraText>
              </div>
              <p className="text-muted-foreground mb-6">
                Install the plugged.in MCP Proxy to your preferred client.
                Access all your tools through a single, unified interface.
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
            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={isSection5InView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="grid grid-cols-3 gap-4"
            >
              <div className="bg-card rounded-lg p-4 flex items-center justify-center shadow-lg">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <p className="text-xs text-muted-foreground">Claude</p>
                </div>
              </div>
              <div className="bg-card rounded-lg p-4 flex items-center justify-center shadow-lg">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <p className="text-xs text-muted-foreground">Cursor</p>
                </div>
              </div>
              <div className="bg-card rounded-lg p-4 flex items-center justify-center shadow-lg">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <p className="text-xs text-muted-foreground">Cline</p>
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* AnimatedBeam connections */}
          {isSection1InView && isSection2InView && (
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={step1Ref}
              toRef={step2Ref}
              curvature={0.3}
              duration={3}
              pathColor="gray"
              pathWidth={2}
              pathOpacity={0.2}
              gradientStartColor="#3b82f6"
              gradientStopColor="#8b5cf6"
              startYOffset={20}
              endYOffset={-20}
            />
          )}
          
          {isSection2InView && isSection3InView && (
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={step2Ref}
              toRef={step3Ref}
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
          )}
          
          {isSection3InView && isSection4InView && (
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={step3Ref}
              toRef={step4Ref}
              curvature={0.3}
              duration={3}
              pathColor="gray"
              pathWidth={2}
              pathOpacity={0.2}
              gradientStartColor="#ec4899"
              gradientStopColor="#f59e0b"
              startYOffset={20}
              endYOffset={-20}
            />
          )}
          
          {isSection4InView && isSection5InView && (
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={step4Ref}
              toRef={step5Ref}
              curvature={0.3}
              duration={3}
              pathColor="gray"
              pathWidth={2}
              pathOpacity={0.2}
              gradientStartColor="#f59e0b"
              gradientStopColor="#3b82f6"
              startYOffset={20}
              endYOffset={-20}
            />
          )}
        </div>
      </div>
    </section>
  );
}
