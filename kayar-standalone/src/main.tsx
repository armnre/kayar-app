import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import '@fontsource-variable/vazirmatn';
import '@fontsource-variable/sora';
import App from './App';
import { seedDemoData } from './zite/seed';
import { DEMO_PASSWORD } from './zite/seed';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

function RuntimeErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="fixed inset-0 grid place-items-center bg-background p-4">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-bg1 p-5">
        <h3 className="mb-2 font-semibold">خطا در نمایش برنامه</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          یک اشکال غیرمنتظره رخ داد. می‌توانی دوباره تلاش کنی؛ اگر تکرار شد حافظه‌ی محلی مرورگر را پاک کن.
        </p>
        <pre className="overflow-auto rounded-xl border-l-4 border-red-500 bg-red-500/10 p-3 font-mono text-xs text-red-200">
          {error.message}
        </pre>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={resetErrorBoundary} className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
            تلاش دوباره
          </button>
          <button
            type="button"
            onClick={() => { localStorage.removeItem('kayar.local-db.v1'); location.reload(); }}
            className="rounded-xl border border-white/15 px-3 py-2 text-sm"
          >
            بازنشانی داده‌های محلی
          </button>
        </div>
      </div>
    </div>
  );
}

async function start() {
  // The hosted platform keeps state in its database; this build keeps it in localStorage,
  // so we make sure the demo dataset exists before the first request is issued.
  try {
    await seedDemoData();
  } catch (e) {
    console.warn('[kayar] demo seeding skipped', e);
  }
  console.info(`[kayar] demo sign-in → admin: admin / ${DEMO_PASSWORD} · member: kp-1040 / ${DEMO_PASSWORD}`);

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary fallbackRender={(props) => <RuntimeErrorFallback error={props.error as Error} resetErrorBoundary={props.resetErrorBoundary} />}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}

void start();
