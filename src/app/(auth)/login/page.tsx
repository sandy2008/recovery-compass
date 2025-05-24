import { LoginForm } from "@/components/auth/LoginForm";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - Recovery Compass',
  description: 'Log in to your Recovery Compass account.',
};

export default function LoginPage() {
  return <LoginForm />;
}
