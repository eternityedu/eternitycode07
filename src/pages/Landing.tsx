import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/hooks/useAuth';
import { Zap, Shield, Code, Eye, Sparkles, ArrowRight } from 'lucide-react';
import logo from '@/assets/logo.png';

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container py-24 text-center relative">
          {/* Background glow effects */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="max-w-3xl mx-auto relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm mb-8 border border-primary/30 glow-primary">
              <Sparkles className="w-4 h-4" />
              AI-Powered Code Generation
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
              Build apps with{' '}
              <span className="text-gradient">
                Eternity Code
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Describe what you want to build and watch it come to life. 
              Edit code in real-time, preview instantly, and ship faster than ever.
            </p>
            <div className="flex gap-4 justify-center">
              {user ? (
                <Button size="lg" asChild className="gap-2 h-12 px-8 text-base glow-primary">
                  <Link to="/">
                    Go to Dashboard
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button size="lg" asChild className="gap-2 h-12 px-8 text-base glow-primary">
                    <Link to="/auth?mode=signup">
                      <Sparkles className="w-5 h-5" />
                      Start Coding Free
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild className="h-12 px-8 text-base border-border/50 hover:border-primary/50">
                    <Link to="/auth">Sign In</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container py-20 border-t border-border/50">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything you need to build faster
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                icon: Zap,
                title: 'Lightning Fast',
                description: 'Generate code instantly with AI. No more starting from scratch.',
              },
              {
                icon: Code,
                title: 'Editable Code',
                description: 'Full Monaco editor. Edit, customize, and make it yours.',
              },
              {
                icon: Eye,
                title: 'Live Preview',
                description: 'See your changes instantly with real-time preview.',
              },
              {
                icon: Shield,
                title: 'Your Control',
                description: 'Review, modify, and own all the code. Full transparency.',
              },
            ].map(({ icon: Icon, title, description }) => (
              <div key={title} className="text-center group">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 group-hover:border-primary/40 transition-all duration-300">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="container py-20">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/20 p-12 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(138,93,255,0.1),transparent_70%)]" />
            <div className="relative">
              <img src={logo} alt="Eternity Code" className="w-16 h-16 rounded-xl mx-auto mb-6 shadow-lg" />
              <h2 className="text-3xl font-bold mb-4">Ready to start building?</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Join developers who are shipping faster with AI-powered code generation.
              </p>
              <Button size="lg" asChild className="gap-2 glow-primary">
                <Link to={user ? "/" : "/auth?mode=signup"}>
                  <Sparkles className="w-5 h-5" />
                  Get Started Now
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50 py-8">
        <div className="container flex items-center justify-center gap-3 text-sm text-muted-foreground">
          <img src={logo} alt="" className="w-5 h-5 rounded" />
          <span className="font-medium">Eternity Code</span>
          <span className="text-border">•</span>
          <span>AI-Powered Code Generation</span>
        </div>
      </footer>
    </div>
  );
}
