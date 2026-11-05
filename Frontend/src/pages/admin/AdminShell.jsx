import AdminToast from './components/AdminToast';
import AdminSidebar from './components/AdminSidebar';
import AdminAnalyticsPage from './components/pages/AdminAnalyticsPage';
import AdminDashboardPage from './components/pages/AdminDashboardPage';
import AdminArticlesPage from './components/pages/AdminArticlesPage';
import AdminEventsPage from './components/pages/AdminEventsPage';
import AdminResourcesPage from './components/pages/AdminResourcesPage';
import AdminContactsPage from './components/pages/AdminContactsPage';
import AdminPartnersPage from './components/pages/AdminPartnersPage';
import AdminEntrepreneursPage from './components/pages/AdminEntrepreneursPage';
import AdminPublicTeamPage from './components/pages/AdminPublicTeamPage';
import AdminNewsletterPage from './components/pages/AdminNewsletterPage';
import AdminUsersPage from './components/pages/AdminUsersPage';
import AdminReactivationPage from './components/pages/AdminReactivationPage';
import AdminStaffPage from './components/pages/AdminStaffPage';
import AdminQuestionnairePage from './components/pages/AdminQuestionnairePage';
import AdminSharedModals from './AdminSharedModals';
import AdminUserDetailModal from './AdminUserDetailModal';
import { useAdminPanel } from './AdminPanelContext';

export default function AdminShell() {
    const {
        activeSection,
        canAccessAnalytics,
        canManageQuestionnaires,
        canManageTeamAndNewsletter,
        canViewContacts,
        currentUserRole,
        navItems,
        setSidebarCollapsed,
        sidebarCollapsed,
        toast,
    } = useAdminPanel();

    return (
        <div className={`admin-layout${sidebarCollapsed ? ' admin-layout--sidebar-collapsed' : ''}`}>
            <AdminToast show={toast.show} message={toast.message} type={toast.type} />
            <AdminSidebar
                navItems={navItems}
                sidebarCollapsed={sidebarCollapsed}
                setSidebarCollapsed={setSidebarCollapsed}
                currentUserRole={currentUserRole}
            />

            <main className="admin-main">
                {activeSection === 'analytics' && canAccessAnalytics && <AdminAnalyticsPage />}

                {activeSection === 'dashboard' && <AdminDashboardPage />}

                {activeSection === 'articles' && <AdminArticlesPage />}

                {activeSection === 'events' && <AdminEventsPage />}

                {activeSection === 'resources' && <AdminResourcesPage />}

                {activeSection === 'contacts' && canViewContacts && <AdminContactsPage />}

                {activeSection === 'partners' && canManageTeamAndNewsletter && <AdminPartnersPage />}

                {activeSection === 'entrepreneurs' && canManageTeamAndNewsletter && <AdminEntrepreneursPage />}

                {activeSection === 'publicteam' && canManageTeamAndNewsletter && <AdminPublicTeamPage />}

                {activeSection === 'newsletter' && canManageTeamAndNewsletter && <AdminNewsletterPage />}

                {activeSection === 'users' && <AdminUsersPage />}

                {activeSection === 'reactivation' && currentUserRole === 'superadmin' && <AdminReactivationPage />}

                {activeSection === 'staff' && <AdminStaffPage />}

                <AdminSharedModals />

                {activeSection === 'questionnaire' && canManageQuestionnaires && <AdminQuestionnairePage />}
            </main>

            <AdminUserDetailModal />
        </div>
    );
}
