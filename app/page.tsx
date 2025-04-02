'use client';

import { LogIn } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { ScrollProgress } from "@/components/magicui/scroll-progress";
import { Hero } from "@/components/sections/hero";
import { UserJourney } from "@/components/sections/user-journey";
import { FeaturesSection } from "@/components/sections/features";
import { TechnicalShowcase } from "@/components/sections/technical-showcase";
import { IntegrationDiagram } from "@/components/sections/integration-diagram";
import { CallToAction } from "@/components/sections/call-to-action";
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/ui/language-switcher';

export default function Home() {
  const { t, ready } = useTranslation();

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <ScrollProgress className="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
      
      <div className="container mx-auto py-8 flex-grow">
        {/* Navigation */}
        <div className="flex justify-end gap-4 items-center mb-8">
          <LanguageSwitcher />
          <Button asChild variant="outline">
            <Link href="/mcp-servers" className="flex items-center">
              <LogIn className="mr-2 h-4 w-4" />
              {t('landing.navigation.enterApp')}
            </Link>
          </Button>
        </div>
        
        <main>
          <Hero />
          <UserJourney />
          <FeaturesSection />
          <TechnicalShowcase />
          <IntegrationDiagram />
          <CallToAction />
        </main>
      </div>
      
      <Footer />
    </div>
  );
}
