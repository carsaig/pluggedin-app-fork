"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";

import { SparklesText } from "@/components/magicui/sparkles-text";
import { HyperText } from "@/components/magicui/hyper-text";

const features = [
  {
    title: "Enhanced Capability Discovery",
    description: "Comprehensive discovery for Tools, Resources, Resource Templates, and Prompts using the client-wrapper",
    icon: "🔍"
  },
  {
    title: "Custom Instructions Support",
    description: "Server-specific instructions storage and management with integrated UI editor component",
    icon: "📝"
  },
  {
    title: "Improved Server Management",
    description: "Enhanced server detail UI with tabs and components to display discovered Tools, Resources, and Resource Templates",
    icon: "🖥️"
  },
  {
    title: "API-Driven Architecture",
    description: "New API endpoints to support the proxy's capability listing and resolution needs",
    icon: "🔌"
  },
  {
    title: "Release Notes System",
    description: "Complete release notes system with filtering, search, and pagination",
    icon: "📋"
  },
  {
    title: "Proxy Enhancements",
    description: "Prefixed tool names for clarity and disambiguation with improved capability resolution",
    icon: "🚀"
  }
];

export function FeaturesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  
  return (
    <section className="py-20 bg-muted/30" id="features">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <SparklesText
            text="Full MCP Specification Compatibility"
            className="text-3xl font-bold mb-4"
            sparklesCount={20}
            colors={{ first: '#A07CFE', second: '#FE8FB5' }}
          />
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We now cover MCP prompts, custom instructions, tools and resources fully compatible with MCP official specifications.
          </p>
        </div>
        
        <div 
          ref={ref}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-card rounded-lg p-6 shadow-lg"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <HyperText
                className="text-xl font-semibold mb-2"
                duration={800}
                as="h3"
                startOnView={true}
                animateOnHover={true}
              >
                {feature.title}
              </HyperText>
              <p className="text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
