import { RegisterForm } from "@/components/auth/RegisterForm";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Register - Recovery Compass',
  description: 'Create a new Recovery Compass account.',
};

export default function RegisterPage() {
  return <RegisterForm />;
}
