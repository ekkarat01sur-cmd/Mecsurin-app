import {Component, type ErrorInfo, type ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    registerSW({
      immediate: true,
      onRegisterError() {
        // Ignore SW registration issues on subpath or restricted static hosts
      },
    });
  } catch {
    // Never block app boot if service worker registration throws
  }
}

interface BoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class RootErrorBoundary extends Component<{children: ReactNode}, BoundaryState> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = {hasError: false, errorMessage: ''};
  }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
    };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Error captured by UI boundary
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F2F6FB] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h1 className="text-lg font-bold text-[#091A32]">
              ไม่สามารถแสดงผลหน้าเว็บชั่วคราว
            </h1>
            <p className="text-sm text-slate-600">{this.state.errorMessage}</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem('surin_mec_portal_v1');
                  } catch {
                    // Ignore storage clear errors
                  }
                  window.location.reload();
                }}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#0D9488] rounded-lg hover:bg-[#0F766E] cursor-pointer"
              >
                รีเซ็ตข้อมูลและโหลดใหม่
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);
