import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { 
  Bot, 
  Workflow, 
  Database, 
  Network, 
  Cpu, 
  Cloud,
  CheckCircle2
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function LandingPage() {
  const features = [
    { icon: Bot, title: 'AI Module Recommendation', desc: 'Intelligently suggest business modules based on your industry.' },
    { icon: Workflow, title: 'AI Workflow Generator', desc: 'Automatically map out complex business logic and processes.' },
    { icon: Database, title: 'Database Schema Generator', desc: 'Create optimized relational schemas with AI assistance.' },
    { icon: Network, title: 'REST API Generator', desc: 'Generate complete API layers instantly.' },
    { icon: Cpu, title: 'Enterprise Application Builder', desc: 'No-code visual builder for modern web applications.' },
    { icon: Cloud, title: 'Deployment Management', desc: 'One-click docker deployment to the cloud.' }
  ];

  const steps = [
    'Register Organization',
    'Create Enterprise Application',
    'Select Industry Template',
    'Choose Business Modules',
    'AI Generates Workflow',
    'Generate Database Schema',
    'Generate REST APIs',
    'Deploy Application'
  ];

  const benefits = [
    'Reduce Development Time',
    'AI-powered Recommendations',
    'No-Code Application Builder',
    'Secure Enterprise Platform',
    'Docker Deployment',
    'Cloud Ready'
  ];

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="pt-32 pb-20 overflow-hidden relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-600/20 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
          >
            Build Enterprise Applications <br />
            with <span className="text-gradient">AI in Minutes</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-400 mb-10 max-w-3xl mx-auto"
          >
            Generate enterprise applications, workflows, database schemas, and REST APIs using Artificial Intelligence.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-4"
          >
            <Link to="/register">
              <Button size="lg" variant="primary">Get Started</Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="secondary">View Demo</Button>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-20 relative mx-auto max-w-5xl"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-primary-500 to-purple-600 rounded-xl blur opacity-30" />
            <div className="relative rounded-xl border border-white/10 glass bg-background overflow-hidden aspect-video flex items-center justify-center">
               {/* Dashboard Mockup Image Placeholder */}
               <div className="text-center text-gray-500 p-12">
                  <Bot className="h-20 w-20 mx-auto text-primary-500 mb-4 opacity-50" />
                  <p className="text-xl font-medium">AI Dashboard Mockup</p>
                  <p className="text-sm">Workflow generation, DB schema, Analytics</p>
               </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-black/40 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Powerful AI Features</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Everything you need to build robust enterprise software.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="h-full hover:border-primary-500/50 transition-colors group">
                  <feature.icon className="h-10 w-10 text-primary-500 mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-400 text-sm">{feature.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-gray-400">Eight simple steps to your enterprise application.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="relative"
              >
                <Card className="text-center h-full flex flex-col items-center justify-center p-8">
                  <div className="h-10 w-10 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center font-bold mb-4">
                    {idx + 1}
                  </div>
                  <h4 className="font-medium text-gray-200">{step}</h4>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-primary-900/10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-12">Why Choose Entera?</h2>
          <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
            {benefits.map((benefit, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="glass px-6 py-3 rounded-full flex items-center gap-2 border border-primary-500/20"
              >
                <CheckCircle2 className="h-5 w-5 text-primary-500" />
                <span className="text-sm font-medium">{benefit}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
