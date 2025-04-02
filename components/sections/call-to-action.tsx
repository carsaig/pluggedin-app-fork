"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { HyperText } from "@/components/magicui/hyper-text";
import { ScriptCopyBtn } from "@/components/magicui/script-copy-btn";

export function CallToAction() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <HyperText
            className="text-3xl font-bold mb-6"
            duration={800}
            as="h2"
            startOnView={true}
            animateOnHover={true}
          >
            Start Managing Your MCP Servers Today
          </HyperText>
          
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join the growing community of developers using Plugged.in to manage their MCP servers.
            Get started in minutes with our simple installation process.
          </p>
          
          <div className="mb-8">
            <ScriptCopyBtn
              showMultiplePackageOptions={true}
              codeLanguage="shell"
              commandMap={{
                npm: "npx @pluggedin/mcp-proxy@latest --pluggedin-api-key YOUR_API_KEY",
                yarn: "yarn dlx @pluggedin/mcp-proxy@latest --pluggedin-api-key YOUR_API_KEY",
                pnpm: "pnpm dlx @pluggedin/mcp-proxy@latest --pluggedin-api-key YOUR_API_KEY",
                bun: "bunx @pluggedin/mcp-proxy@latest --pluggedin-api-key YOUR_API_KEY"
              }}
              className="w-full max-w-2xl mx-auto"
              lightTheme="github-light"
              darkTheme="github-dark"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/setup-guide"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              Get Started
            </Link>
            <Link
              href="/documentation"
              className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-6 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              View Documentation
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
