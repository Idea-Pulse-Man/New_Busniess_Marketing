import { AuthForm } from "../auth-form";

export const metadata = { title: "Admin sign up" };

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
