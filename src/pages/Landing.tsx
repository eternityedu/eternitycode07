import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/hooks/useAuth';
import { Zap, Shield, Code, Eye } from 'lucide-react';
import logo from '@/assets/logo.png';

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container py-24 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm mb-6 border border-primary/20">
              <img src={logo} alt="" className="w-5 h-5 rounded" />
              Vibe Coding with AI
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
              Build apps with{' '}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Eternity Code
              </span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Describe what you want to build and watch it come to life. 
              Edit code in real-time, preview instantly, and ship faster than ever.
            </p>
            <div className="flex gap-4 justify-center">
              {user ? (
                <Button size="lg" asChild>
                  <Link to="/">Go to Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button size="lg" asChild className="gap-2">
                    <Link to="/auth?mode=signup">
                      Start Coding Free
                    </Link>
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
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Lightning Fast</h3>
              <p className="text-muted-foreground text-sm">
                Generate code instantly with AI. No more starting from scratch.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Code className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Editable Code</h3>
              <p className="text-muted-foreground text-sm">
                Full Monaco editor. Edit, customize, and make it yours.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Eye className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Live Preview</h3>
              <p className="text-muted-foreground text-sm">
                See your changes instantly with real-time preview.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Your Control</h3>
              <p className="text-muted-foreground text-sm">
                Review, modify, and own all the code. Full transparency.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6">
        <div className="container flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <img src={logo} alt="" className="w-4 h-4 rounded" />
          Eternity Code • Vibe Coding with AI
        </div>
      </footer>
    </div>
  );
}
