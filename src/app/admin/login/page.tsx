import { AuthForm } from "../auth-form";

export const metadata = { title: "Admin login" };

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
