export interface MenuItemTree {
  menuItemId: number;
  title: string;
  icon: string;
  routeUrl: string | null;
  sortOrder: number;
  children: MenuItemTree[];
}

/** Flat admin view from GET /api/menu/all */
export interface MenuItemAdmin {
  menuItemId: number;
  parentId: number | null;
  title: string;
  icon: string | null;
  routeUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  roleIds: number[];
}

export interface CreateMenuItemRequest {
  parentId?: number | null;
  title: string;
  icon?: string | null;
  routeUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
  roleIds: number[];
}

export interface UpdateMenuItemRequest {
  parentId?: number | null;
  title: string;
  icon?: string | null;
  routeUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export const MENU_ROLES: { id: number; name: string }[] = [
  { id: 1, name: 'Super Admin' },
  { id: 2, name: 'Admin' },
  { id: 3, name: 'Principal' },
  { id: 4, name: 'Teacher' },
  { id: 5, name: 'Parent' },
  { id: 6, name: 'Staff' },
];
