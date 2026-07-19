export interface MenuItemTree {
  menuItemId: number;
  title: string;
  icon: string;
  routeUrl: string | null;
  sortOrder: number;
  children: MenuItemTree[];
}
