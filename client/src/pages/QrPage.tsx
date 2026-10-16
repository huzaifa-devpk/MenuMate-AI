import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { Copy, Download, QrCode } from "lucide-react";
import type { Menu, ShareInfo } from "@shared";
import { Alert, Button, ButtonLink, Input, PageHeader, Spinner } from "../components/ui";
import { api, errorMessage } from "../lib/api";

export function QrPage() {
  const { id = "" } = useParams();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [share, setShare] = useState<ShareInfo | null>(null);
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [menuData, shareData] = await Promise.all([api<Menu>(`/api/menus/${id}`), api<ShareInfo>(`/api/menus/${id}/share`)]);
      setMenu(menuData);
      setShare(shareData);
      setSlug(shareData.slug);
      document.title = `Share ${menuData.name} · MenuMate AI`;
    } catch (err) {
      setError(errorMessage(err, "Could not load sharing details."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // load is recreated each render; the id is the only input that should refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function publish(next: boolean) {
    setBusy(next ? "publish" : "unpublish");
    setError(null);
    setNotice(null);
    try {
      const updated = await api<Menu>(`/api/menus/${id}/${next ? "publish" : "unpublish"}`, { method: "POST" });
      setMenu(updated);
      const shareData = await api<ShareInfo>(`/api/menus/${id}/share`);
      setShare(shareData);
      setNotice(next ? "Menu published. The link and QR code are live for anyone who can open this server." : "Menu unpublished. The public link no longer shows the menu.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function saveSlug(event: FormEvent) {
    event.preventDefault();
    setBusy("slug");
    setError(null);
    setNotice(null);
    try {
      const updated = await api<Menu>(`/api/menus/${id}`, { method: "PATCH", body: JSON.stringify({ slug }) });
      setMenu(updated);
      const shareData = await api<ShareInfo>(`/api/menus/${id}/share`);
      setShare(shareData);
      setSlug(shareData.slug);
      setNotice("Public link updated. Download the QR code again so it matches.");
    } catch (err) {
      setError(errorMessage(err, "Could not update the link."));
    } finally {
      setBusy(null);
    }
  }

  async function copyLink() {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(share.publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy automatically. Select the link and copy it.");
    }
  }

  function download() {
    if (!share) return;
    const anchor = document.createElement("a");
    anchor.href = share.qrDataUrl;
    anchor.download = `${share.slug}-qr.png`;
    anchor.click();
  }

  if (loading) return <Spinner label="Preparing the QR code…" />;
  if (!menu || !share) {
    return (
      <div className="container-page py-16">
        <Alert tone="error" title="Sharing unavailable">
          {error ?? "This menu does not exist."}
        </Alert>
        <ButtonLink to="/dashboard" className="mt-6" variant="secondary">
          Back to dashboard
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="container-page animate-rise py-10">
      <PageHeader
        eyebrow="Sharing"
        title="QR code and public link"
        description="The code points at this menu’s public address. Publish the menu before you print it."
        actions={
          <>
            <ButtonLink to={`/menu/${menu.id}/edit`} variant="outline" size="sm">
              Editor
            </ButtonLink>
            <ButtonLink to={`/menu/${menu.id}/preview`} variant="ghost" size="sm">
              Preview
            </ButtonLink>
          </>
        }
      />

      {error && (
        <Alert tone="error" className="mb-4">
          {error}
        </Alert>
      )}
      {notice && (
        <Alert tone="success" className="mb-4">
          {notice}
        </Alert>
      )}
      {!share.isPublished && (
        <Alert tone="warn" title="Not published" className="mb-4">
          Scanning this code opens a page that says the menu is not published. Publish it when you are ready for guests to see it.
        </Alert>
      )}
      {share.isLocalUrl && (
        <Alert tone="info" title="Local address" className="mb-4">
          This QR code uses {share.publicUrl}. It only works on devices that can reach this computer. It is not a public internet link. Set APP_BASE_URL to your deployed address before printing codes for guests.
        </Alert>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[320px_1fr]">
        <div className="card flex flex-col items-center p-6">
          <img src={share.qrDataUrl} alt={`QR code linking to ${share.publicUrl}`} width={256} height={256} className="rounded-xl" />
          <p className="mt-3 inline-flex items-center gap-1 text-xs text-charcoal-500">
            <QrCode className="size-3.5" aria-hidden /> PNG · {share.slug}
          </p>
          <div className="mt-4 flex gap-2">
            <Button size="sm" icon={Download} onClick={download}>
              Download PNG
            </Button>
            <Button size="sm" variant="outline" icon={Copy} onClick={() => void copyLink()}>
              {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <label className="label" htmlFor="public-url">
              Public URL
            </label>
            <input id="public-url" className="input" readOnly value={share.publicUrl} onFocus={(e) => e.currentTarget.select()} />
            <div className="mt-4 flex flex-wrap gap-2">
              {!menu.isDemo && !menu.isPublished && (
                <Button loading={busy === "publish"} onClick={() => void publish(true)}>
                  Publish menu
                </Button>
              )}
              {!menu.isDemo && menu.isPublished && (
                <Button variant="secondary" loading={busy === "unpublish"} onClick={() => void publish(false)}>
                  Unpublish
                </Button>
              )}
              {menu.isPublished && (
                <ButtonLink to={`/m/${menu.slug}`} variant="outline">
                  Open public menu
                </ButtonLink>
              )}
            </div>
            {menu.isDemo && <p className="mt-3 text-sm text-charcoal-500">The sample menu stays published so the demo link keeps working.</p>}
          </div>

          {!menu.isDemo && (
            <form onSubmit={saveSlug} className="card p-5">
              <Input
                label="Public slug"
                name="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                hint="Lowercase letters, numbers and hyphens. Changing it changes the QR code."
              />
              <Button type="submit" className="mt-3" variant="secondary" loading={busy === "slug"}>
                Save link
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
