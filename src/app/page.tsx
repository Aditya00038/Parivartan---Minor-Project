'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BarChart, Bot, Camera, CheckCircle, Flag, GaugeCircle, HardHat, MapPin, Phone, Send, Trophy, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import type { User as UserProfile } from '@/lib/types';
import LanguageSelector from '@/components/translation/language-selector';
import GoogleTranslate from '@/components/GoogleTranslate';

const featureCards = [
  {
    icon: <Camera className="h-10 w-10 text-emerald-600" />,
    title: 'Visual Reporting',
    description: 'Snap a photo of any issue - roads, garbage, potholes, or citizen concerns. Auto geo-tags location.',
  },
  {
    icon: <GaugeCircle className="h-10 w-10 text-emerald-600" />,
    title: 'Real-Time Tracking',
    description: 'Follow your report from submission to resolution with live status updates and progress tracking.',
  },
  {
    icon: <Bot className="h-10 w-10 text-emerald-600" />,
    title: 'AI-Powered Analysis',
    description: 'Our AI analyzes issues and suggests the best department for faster resolution and prioritization.',
  },
];

const reportingSteps = [
    {
      step: 1,
      title: 'Submit Your Report',
      description: 'Capture a photo, add details, and submit. Your report is instantly logged.',
    },
    {
      step: 2,
      title: 'Verification & Assignment',
      description: 'Our team verifies the issue and assigns it to the right department or field worker.',
    },
    {
        step: 3,
        title: 'Work in Progress',
        description: 'Track the progress in real-time as our team works on the resolution.',
    },
    {
        step: 4,
        title: 'Issue Resolved',
        description: 'Receive a notification once the work is done, with "after" photos for proof.',
    },
]

const teamMembers = [
    'Aditya Suryawanshi',
    'Vaishnavi Kharpase',
    'Himanshu Patil',
    'Sneha Gurav',
    'Aaditya Hande',
];


export default function LandingPage() {
    const [showTeamModal, setShowTeamModal] = useState(false);
    const heroImage = PlaceHolderImages.find(img => img.id === 'hero-road') ?? PlaceHolderImages[0];
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const userDocRef = useMemoFirebase(() => {
      if (!firestore || !user) return null;
      return doc(firestore, 'users', user.uid);
    }, [firestore, user]);

    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

    function getPortalPath(role?: UserProfile['role']): string {
      if (role === 'worker') return '/worker/dashboard';
      if (role === 'official' || role === 'department_head') return '/smc/dashboard';
      return '/citizen/dashboard';
    }

    // Redirect to the correct portal dashboard if user is already logged in
    useEffect(() => {
      if (!isUserLoading && !isProfileLoading && user && userProfile !== undefined) {
        const hasVisitedBefore = localStorage.getItem('parivartan_visited');
        if (hasVisitedBefore) {
          router.push(getPortalPath(userProfile?.role));
        } else {
          localStorage.setItem('parivartan_visited', 'true');
        }
      }
    }, [user, isUserLoading, userProfile, isProfileLoading, router]);

    // Scroll to portals section
    const scrollToPortals = () => {
      const portalsSection = document.getElementById('portals');
      if (portalsSection) {
        portalsSection.scrollIntoView({ behavior: 'smooth' });
      }
    };

    // Static stats for fast loading - no Firebase queries needed on landing page
    const stats = {
        activeCitizens: 1247,
        reportsSubmitted: 3584,
        issuesResolved: 2891,
        satisfactionRate: '94',
    };

    const isLoading = false;
    
  return (
    <div className="flex flex-col min-h-screen">
      <GoogleTranslate />
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 shadow-sm">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">Parivartan</span>
          </Link>
          <nav className="hidden md:flex gap-8 text-sm font-medium">
            <Link href="#features" className="text-gray-600 transition-colors hover:text-emerald-600">
              Features
            </Link>
            <Link href="#how-it-works" className="text-gray-600 transition-colors hover:text-emerald-600">
              How It Works
            </Link>
             <Link href="/about-smc" className="text-gray-600 transition-colors hover:text-emerald-600">
              About SMC
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <Button onClick={scrollToPortals} className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-md">
              Get Started
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative w-full min-h-[85vh] flex items-center justify-center text-center text-white px-4 overflow-hidden">
            <Image
                src={heroImage.imageUrl}
                alt={heroImage.description}
                fill
                className="object-cover -z-10 brightness-[0.35] scale-105"
                data-ai-hint={heroImage.imageHint}
                priority
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 -z-10" />
            
          <div className="container max-w-4xl">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-7xl leading-tight">
              Report Issues,<br />
              <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">Make City Better.</span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-gray-200 leading-relaxed">
              Report road damage, garbage dumps, potholes, or any citizen issue to Pune Municipal Corporation. Get real-time tracking and see results.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
              <Button onClick={scrollToPortals} size="lg" className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 text-base px-8 h-14 rounded-xl">
                Report an Issue
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button onClick={scrollToPortals} size="lg" variant="outline" className="bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20 hover:text-white shadow-xl text-base px-8 h-14 rounded-xl">
                Get Started
              </Button>
            </div>
            
            {/* Scroll indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
              <span className="text-xs text-white/70">Scroll to explore</span>
              <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
                <div className="w-1.5 h-3 rounded-full bg-white/70 animate-pulse" />
              </div>
            </div>
          </div>
        </section>

        <section id="stats" className="py-16 md:py-20 bg-gradient-to-b from-white to-gray-50">
             <div className="container">
                 <div className="grid gap-8 grid-cols-2 md:grid-cols-4 text-center">
                    <div className="group flex flex-col items-center p-6 rounded-2xl bg-white shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
                        <div className="p-4 rounded-full bg-emerald-100 group-hover:bg-emerald-200 transition-colors">
                          <Users className="h-8 w-8 md:h-10 md:w-10 text-emerald-600"/>
                        </div>
                        {isLoading ? <Skeleton className="h-9 w-24 mt-3" /> : <p className="text-2xl md:text-4xl font-bold text-gray-900 mt-3">{stats?.activeCitizens ?? '...'}</p>}
                        <p className="text-xs md:text-sm text-gray-500 mt-1">Active Citizens</p>
                    </div>
                     <div className="group flex flex-col items-center p-6 rounded-2xl bg-white shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
                        <div className="p-4 rounded-full bg-blue-100 group-hover:bg-blue-200 transition-colors">
                          <Flag className="h-8 w-8 md:h-10 md:w-10 text-blue-600"/>
                        </div>
                        {isLoading ? <Skeleton className="h-9 w-24 mt-3" /> : <p className="text-2xl md:text-4xl font-bold text-gray-900 mt-3">{stats?.reportsSubmitted ?? '...'}</p>}
                        <p className="text-xs md:text-sm text-gray-500 mt-1">Reports Submitted</p>
                    </div>
                     <div className="group flex flex-col items-center p-6 rounded-2xl bg-white shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
                        <div className="p-4 rounded-full bg-green-100 group-hover:bg-green-200 transition-colors">
                          <CheckCircle className="h-8 w-8 md:h-10 md:w-10 text-green-600"/>
                        </div>
                        {isLoading ? <Skeleton className="h-9 w-24 mt-3" /> : <p className="text-2xl md:text-4xl font-bold text-gray-900 mt-3">{stats?.issuesResolved ?? '...'}</p>}
                        <p className="text-xs md:text-sm text-gray-500 mt-1">Issues Resolved</p>
                    </div>
                     <div className="group flex flex-col items-center p-6 rounded-2xl bg-white shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
                        <div className="p-4 rounded-full bg-amber-100 group-hover:bg-amber-200 transition-colors">
                          <Trophy className="h-8 w-8 md:h-10 md:w-10 text-amber-600"/>
                        </div>
                        {isLoading ? <Skeleton className="h-9 w-24 mt-3" /> : <p className="text-2xl md:text-4xl font-bold text-gray-900 mt-3">{stats?.satisfactionRate ?? '...'}%</p>}
                        <p className="text-xs md:text-sm text-gray-500 mt-1">Satisfaction Rate</p>
                    </div>
                 </div>
            </div>
        </section>

        <section id="features" className="py-16 md:py-24 bg-gradient-to-b from-gray-50 to-white">
          <div className="container">
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium mb-4">Features</span>
              <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">Platform Features</h2>
              <p className="text-gray-600 max-w-2xl mx-auto text-base md:text-lg">A comprehensive system to connect citizens, workers, and officials for a better Pune.</p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {featureCards.map((feature, index) => (
                <div key={index} className="group p-8 rounded-2xl bg-white shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-emerald-200 text-center flex flex-col items-center">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-100 group-hover:from-emerald-100 group-hover:to-green-200 transition-colors">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-16 md:py-24 bg-white">
             <div className="container">
                <div className="text-center mb-16">
                  <span className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-4">Process</span>
                  <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">From Report to Resolution</h2>
                  <p className="text-gray-600 max-w-2xl mx-auto">Simple 4-step process to fix road issues in your area</p>
                </div>
                <div className="relative max-w-4xl mx-auto">
                    <div className="hidden md:block absolute left-1/2 -translate-x-1/2 w-1 h-full bg-gradient-to-b from-emerald-500 via-green-500 to-emerald-600 rounded-full"></div>
                    {reportingSteps.map((step, index) => (
                        <div key={step.step} className="flex md:items-center mb-12 flex-col md:flex-row">
                            <div className={`flex w-full md:w-1/2 ${index % 2 === 0 ? 'md:pr-12 md:justify-end' : 'md:pl-12 md:justify-start md:order-last'}`}>
                                 <div className="w-full md:max-w-sm">
                                    <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-emerald-200">
                                        <div className="flex items-center gap-3 mb-3">
                                          <span className="md:hidden flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-white font-bold">{step.step}</span>
                                          <h3 className="text-lg md:text-xl font-bold text-gray-900">{step.title}</h3>
                                        </div>
                                        <p className="text-gray-600">{step.description}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="hidden md:flex w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-white items-center justify-center font-bold text-2xl z-10 shrink-0 shadow-lg ring-4 ring-white">
                               {step.step}
                            </div>
                             <div className="w-full md:w-1/2"></div>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        <section id="portals" className="py-16 md:py-24 bg-gradient-to-b from-gray-50 to-white">
          <div className="container">
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium mb-4">Get Started</span>
              <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">Access Your Portal</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">Choose your role and login to access the platform features</p>
            </div>
            <div className="grid gap-8 grid-cols-1 md:grid-cols-3 max-w-5xl mx-auto">
              <div className="group flex flex-col items-center text-center p-8 rounded-2xl bg-white border-2 border-emerald-100 shadow-lg hover:shadow-2xl hover:border-emerald-300 transition-all duration-300 hover:-translate-y-1">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-10 w-10 text-white"/>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mt-6 mb-2">Citizen Portal</h3>
                <p className="text-gray-600 mb-6 flex-1">Report issues, track progress, and view leaderboards.</p>
                <Button asChild className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-md h-12 text-base rounded-xl">
                  <Link href="/citizen/login">Login as Citizen</Link>
                </Button>
              </div>
               <div className="group flex flex-col items-center text-center p-8 rounded-2xl bg-white border-2 border-orange-100 shadow-lg hover:shadow-2xl hover:border-orange-300 transition-all duration-300 hover:-translate-y-1">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <HardHat className="h-10 w-10 text-white"/>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mt-6 mb-2">Worker Portal</h3>
                <p className="text-gray-600 mb-6 flex-1">View assigned tasks, update work status, and upload proof.</p>
                <Button asChild className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-md h-12 text-base rounded-xl">
                   <Link href="/worker/login">Login as Worker</Link>
                </Button>
              </div>
               <div className="group flex flex-col items-center text-center p-8 rounded-2xl bg-white border-2 border-blue-100 shadow-lg hover:shadow-2xl hover:border-blue-300 transition-all duration-300 hover:-translate-y-1">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <BarChart className="h-10 w-10 text-white"/>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mt-6 mb-2">PMC Admin Portal</h3>
                <p className="text-gray-600 mb-6 flex-1">Verify reports, assign tasks, and monitor progress.</p>
                <Button asChild className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-md h-12 text-base rounded-xl">
                   <Link href="/smc/login">Login as Officer</Link>
                </Button>
              </div>
              {/* Department Head Portal */}
              <div className="flex flex-col bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-shadow">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md">
                  <Users className="h-10 w-10 text-white"/>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mt-6 mb-2">Department Portal</h3>
                <p className="text-gray-600 mb-6 flex-1">Department heads manage their queue, assign field workers, and track resolution rates.</p>
                <Button asChild className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-md h-12 text-base rounded-xl">
                   <Link href="/dept/login">Login as Dept Head</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 md:py-16 border-t bg-gray-900 text-gray-400">
        <div className="container">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
                <div className="col-span-2 md:col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-lg font-bold text-white">Parivartan</h3>
                    </div>
                    <p className="text-sm max-w-sm leading-relaxed">A Smart City initiative by Pune Municipal Corporation to create safer, better roads through public participation and data-driven governance.</p>
                </div>
                <div>
                    <h4 className="font-semibold text-white mb-4">Quick Links</h4>
                    <ul className="space-y-2">
                        <li><Link href="#features" className="text-sm hover:text-emerald-400 transition-colors">Features</Link></li>
                        <li><Link href="#how-it-works" className="text-sm hover:text-emerald-400 transition-colors">How It Works</Link></li>
                        <li><Link href="/citizen/report" className="text-sm hover:text-emerald-400 transition-colors">Report an Issue</Link></li>
                        <li><Link href="/citizen/dashboard" className="text-sm hover:text-emerald-400 transition-colors">Citizen Portal</Link></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-semibold text-white mb-4">Resources</h4>
                    <ul className="space-y-2">
                        <li><Link href="/about-smc" className="text-sm hover:text-emerald-400 transition-colors">About SMC</Link></li>
                        <li><Link href="/privacy" className="text-sm hover:text-emerald-400 transition-colors">Privacy Policy</Link></li>
                        <li><Link href="/terms" className="text-sm hover:text-emerald-400 transition-colors">Terms of Service</Link></li>
                        <li><Link href="/sla" className="text-sm hover:text-emerald-400 transition-colors">SLA Policy</Link></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-semibold text-white mb-4">Contact Us</h4>
                    <ul className="space-y-3 text-sm">
                        <li className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 mt-1 text-emerald-400 shrink-0"/>
                            <span>Pune Municipal Corporation, Pune, Maharashtra</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Send className="h-4 w-4 text-emerald-400 shrink-0"/>
                            <a href="mailto:contact@pmc.gov.in" className="hover:text-emerald-400 transition-colors">contact@pmc.gov.in</a>
                        </li>
                        <li className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-emerald-400 shrink-0"/>
                            <a href="tel:1800-123-4567" className="hover:text-emerald-400 transition-colors">1800-123-4567</a>
                        </li>
                    </ul>
                </div>
            </div>
            <div className="mt-12 border-t border-gray-700 pt-8 text-center text-sm">
                <p className="text-gray-400">© {new Date().getFullYear()} Pune Municipal Corporation. All rights reserved.</p>
                 <p className="text-xs text-gray-500 mt-3">
                    Designed & Developed as a Smart City Initiative by {' '}
                    <Dialog open={showTeamModal} onOpenChange={setShowTeamModal}>
                        <DialogTrigger asChild>
                            <span className="font-semibold text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer transition-colors">Team Parivartan</span>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold">Team Parivartan</DialogTitle>
                            </DialogHeader>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-3 pt-4">
                                {teamMembers.map((name) => (
                                    <p key={name} className="text-lg text-gray-700">{name}</p>
                                ))}
                            </div>
                        </DialogContent>
                    </Dialog>
                 </p>
            </div>
        </div>
      </footer>
    </div>
  );
}
