import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Sparkles, Lock, RefreshCw, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ThemeToggle } from '../components/ThemeToggle';

const DEMO_FEATURES = [
  { icon: Database,   title: 'Live schema browser',     desc: 'Tables, columns, types, indexes — all in one place.' },
  { icon: Sparkles,   title: 'Permanent team annotations', desc: 'Write notes on any table or column. They survive re-scans.' },
  { icon: Lock,       title: 'Read-only. Always.',       desc: 'SchemaLens never writes to your database.' },
  { icon: RefreshCw,  title: 'Re-scan anytime',          desc: 'Re-introspect and all your annotations re-attach automatically.' },
];

export function ConnectPage() {
  const [connectionString, setConnectionString] = useState('');
  const [name, setName] = useState('');
  const [scanning, setScanning] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const navigate = useNavigate();

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!connectionString.trim()) return;
    setScanning(true);
    try {
      const result = await api.scan(connectionString.trim(), name.trim() || undefined);
      navigate(`/connections/${result.connectionId}`, { state: result });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      toast.error(msg);
    } finally {
      setScanning(false);
    }
  }

  async function handleDemo() {
    setDemoLoading(true);
    try {
      const result = await api.demoScan();
      navigate(`/connections/${result.connectionId}`, { state: result });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Demo unavailable — is the seed loaded?';
      toast.error(msg);
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="w-full border-b">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <Database className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">SchemaLens</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-xl text-center"
        >
          {/* Hero */}
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-4">
            Your database,{' '}
            <span className="text-primary">documented</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-10 max-w-md mx-auto">
            Paste a PostgreSQL connection string. Browse the schema, draw the ER diagram, and
            attach permanent team notes — all stored outside the target database.
          </p>

          {/* Connect form */}
          <form onSubmit={handleScan} className="flex flex-col gap-3 mb-5">
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Connection name (optional)"
              className="h-10"
            />
            <div className="flex gap-2">
              <Input
                type="password"
                value={connectionString}
                onChange={(e) => setConnectionString(e.target.value)}
                placeholder="postgresql://user:pass@host/dbname"
                className="h-10 font-mono text-xs flex-1"
                required
                autoComplete="off"
                spellCheck={false}
              />
              <Button type="submit" loading={scanning} className="h-10 px-5 shrink-0">
                Scan
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-left">
              Connection strings are never stored. Only the host and database name are saved for labelling.
            </p>
          </form>

          <div className="relative my-6 flex items-center gap-3">
            <div className="flex-1 border-t border-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 border-t border-border" />
          </div>

          <Button
            variant="outline"
            onClick={handleDemo}
            loading={demoLoading}
            className="w-full h-10 gap-2"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            Try the demo schema — e-commerce shop
          </Button>
        </motion.div>

        {/* Feature grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl w-full px-4"
        >
          {DEMO_FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex flex-col gap-2 rounded-xl border bg-card p-5 text-left"
            >
              <f.icon className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
