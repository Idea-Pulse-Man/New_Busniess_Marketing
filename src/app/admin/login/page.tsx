import { AuthShell } from "../auth-shell";
import { LoginForm } from "./login-form";

export const metadata = { title: "Admin login" };

export default function LoginPage() {
  return (
    <AuthShell
      title="Admin login"
      subtitle="Sign in to manage applications."
      footer="You'll be asked for a code from your authenticator app next."
    >
      <LoginForm />
    </AuthShell>
  );
}
