import { Link, useParams } from 'react-router-dom';
import { Database, Home, ChevronRight } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { GlobalSearch } from './GlobalSearch';

interface LayoutProps {
  children: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  showSearch?: boolean;
}

export function Layout({ children, breadcrumbs, showSearch }: LayoutProps) {
  const { id } = useParams<{ id: string }>();
  const connectionId = id ? Number(id) : undefined;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 font-semibold text-sm shrink-0">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <Database className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="hidden sm:inline text-foreground">SchemaLens</span>
          </Link>

          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-1 text-sm text-muted-foreground overflow-hidden">
              <Link to="/" className="hover:text-foreground transition-colors shrink-0">
                <Home className="h-3.5 w-3.5" />
              </Link>
              {breadcrumbs.map((b, i) => (
                <span key={i} className="flex items-center gap-1 min-w-0">
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                  {b.href ? (
                    <Link
                      to={b.href}
                      className="hover:text-foreground transition-colors truncate max-w-[160px]"
                    >
                      {b.label}
                    </Link>
                  ) : (
                    <span className="text-foreground font-medium truncate max-w-[160px]">
                      {b.label}
                    </span>
                  )}
                </span>
              ))}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-3">
            {showSearch && connectionId && (
              <GlobalSearch connectionId={connectionId} />
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
