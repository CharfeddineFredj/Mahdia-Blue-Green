import { createContext, useContext } from 'react';

/** Contexte : état et actions partagés par les sous-pages `/admin/...` */
export const AdminPanelContext = createContext(null);

export function useAdminPanel() {
    const v = useContext(AdminPanelContext);
    if (!v) {
        throw new Error('useAdminPanel doit être utilisé dans l’espace admin (AdminPanelContext).');
    }
    return v;
}
