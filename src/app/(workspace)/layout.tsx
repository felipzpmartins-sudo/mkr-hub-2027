import { requireUser } from "@/services/authorization";
import { Scene } from "@/components/scene";
import { TopNav } from "@/components/top-nav";
import { canViewAccountDirectory } from "@/lib/account-directory";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="app-shell">
      <Scene variant="ambient" fixed />
      <TopNav
        user={{
          name: user.name,
          hubRole: user.hubRole,
          department: user.department,
          jobTitle: user.jobTitle,
          canViewAccountDirectory: canViewAccountDirectory(user.email),
        }}
      />
      <main id="main-content" className="page-content">
        {children}
      </main>
      <footer className="workspace-footer">
        <div className="footer-row">
          <span>
            MKR HUB <span className="footer-divider">/</span> Seu trabalho, conectado.
          </span>
          <span>
            <span className="live-dot" /> Workspace corporativo
          </span>
        </div>
        <p className="footer-mark" aria-hidden="true">
          MKR HUB
        </p>
      </footer>
    </div>
  );
}
