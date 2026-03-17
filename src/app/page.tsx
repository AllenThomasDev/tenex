import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session) {
    return <AppShell user={session.user} />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <main id="main-content" className="flex flex-col items-center gap-8 px-6 text-center">
        <>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground">
            Calendar Assistant
          </h1>
          <form
            action={async () => {
              "use server";
              const result = await auth.api.signInSocial({
                body: {
                  provider: "google",
                  callbackURL: "/",
                },
              });

              if (result?.url) {
                redirect(result.url);
              }
            }}
          >
            <Button className="h-11 rounded-full px-6">
              Sign in with Google
            </Button>
          </form>
        </>
      </main>
    </div>
  );
}
