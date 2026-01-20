import FloatingIcons from '@/components/floating-icons';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <FloatingIcons />
      <div className="relative z-10">{children}</div>
      <div id="recaptcha-container" />
    </div>
  );
}
