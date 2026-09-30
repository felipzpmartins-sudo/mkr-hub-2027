import { requireUser } from "@/services/authorization";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="app-shell">
      <Sidebar user={{ name: user.name, hubRole: user.hubRole, department: user.department }} />
      <div className="workspace-main">
        <Header name={user.name} jobTitle={user.jobTitle} hubRole={user.hubRole} />
        <main id="main-content" className="page-content">
          {children}
        </main>
        <footer className="workspace-footer">
          <span>
            MKR HUB <span className="footer-divider">/</span> Seu trabalho, conectado.
          </span>
          <span>
            <span className="live-dot" /> Workspace corporativo
          </span>
        </footer>
      </div>
    </div>
  );
}
