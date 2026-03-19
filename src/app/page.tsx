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
          <div className="max-w-sm rounded-lg border border-border bg-muted/50 px-4 py-3 text-left text-xs text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">Heads up</p>
            <p>
              Google will show an &ldquo;unverified app&rdquo; warning during sign-in.
              Click <span className="font-medium text-foreground">Advanced</span> &rarr;{" "}
              <span className="font-medium text-foreground">Go to tenex-lac.vercel.app</span> to
              continue. This app only reads and writes to your calendar — no data is stored beyond
              your session.
            </p>
          </div>
        </>
      </main>
    </div>
  );
}
