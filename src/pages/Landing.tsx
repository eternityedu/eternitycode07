import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/hooks/useAuth';
import { Sparkles, Zap, Shield, Code } from 'lucide-react';

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container py-24 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-6">
              <Sparkles className="w-4 h-4" />
              AI-Powered App Builder
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
              Build apps with the power of{' '}
              <span className="text-primary">AI</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Describe what you want to build and let AI help you create it. 
              From idea to working code in minutes, not hours.
            </p>
            <div className="flex gap-4 justify-center">
              {user ? (
                <Button size="lg" asChild>
                  <Link to="/">Go to Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button size="lg" asChild>
                    <Link to="/auth?mode=signup">Get Started Free</Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/auth">Sign In</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container py-16 border-t">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Lightning Fast</h3>
              <p className="text-muted-foreground">
                Generate code instantly with AI. No more starting from scratch.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Code className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Clean Code</h3>
              <p className="text-muted-foreground">
                AI generates modular, maintainable code following best practices.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Your Control</h3>
              <p className="text-muted-foreground">
                Review, modify, and own all the code. Full transparency.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6">
        <div className="container text-center text-sm text-muted-foreground">
          Built with AI • © 2024 AppBuilder
        </div>
      </footer>
    </div>
  );
}
