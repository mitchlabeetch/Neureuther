import { Link, useNavigate } from "react-router-dom";
import { NeonAuthUIProvider } from "@neondatabase/auth/react";
import { authClient } from "@/lib/auth-client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  return (
    <NeonAuthUIProvider
      authClient={authClient}
      defaultTheme="light"
      navigate={(href) => navigate(href)}
      replace={(href) => navigate(href, { replace: true })}
      Link={({ href, ...props }: { href: string } & Record<string, unknown>) => (
        <Link to={href} {...props} />
      )}
    >
      {children}
    </NeonAuthUIProvider>
  );
}