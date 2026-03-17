import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Chat } from "./chat";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="flex flex-col items-center gap-8">
        {session ? (
          <>
            <p className="text-lg text-zinc-900 dark:text-zinc-100">
              Signed in as {session.user.email}
            </p>
            <Chat />
            <form
              action={async () => {
                "use server";
                await auth.api.signOut({ headers: await headers() });
                redirect("/");
              }}
            >
              <button className="rounded-full bg-zinc-900 px-6 py-3 text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300">
                Sign Out
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
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
              <button className="rounded-full bg-zinc-900 px-6 py-3 text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300">
                Sign in with Google
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
