import { CheckCircle2, XCircle } from "lucide-react";

export default async function TeamConnectedPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; name?: string }>;
}) {
  const { ok, error, name } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="max-w-sm w-full text-center">
        {ok ? (
          <>
            <div className="w-14 h-14 rounded-full bg-success-soft flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-success" />
            </div>
            <h1 className="text-xl font-bold text-fg">Gmail connected{name ? `, ${name}` : ""}</h1>
            <p className="text-sm text-fg-muted mt-2">
              Client emails sent to your inbox will now show up in the team&apos;s inbox tracker,
              even if they were never CC&apos;d to anyone else. You can close this tab.
            </p>
            <p className="text-xs text-fg-subtle mt-4">
              Only read access is used, and it can be revoked any time from your Google Account permissions.
            </p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-full bg-danger-soft flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-7 h-7 text-danger" />
            </div>
            <h1 className="text-xl font-bold text-fg">Something went wrong</h1>
            <p className="text-sm text-fg-muted mt-2">
              The connection didn&apos;t complete. Please ask for a fresh link and try again.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
