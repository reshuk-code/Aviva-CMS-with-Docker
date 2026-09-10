import {
  BookOpen,
  Building2,
  CalendarCheck,
  Compass,
  Database,
  FileText,
  Footprints,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  Link2,
  type LucideIcon,
  MapPinned,
  MessageSquareQuote,
  Navigation,
  PanelBottom,
  PanelTop,
  Plug,
  Quote,
  Share2,
  Search,
  Settings,
  ShieldCheck,
  Terminal,
  Users,
} from "lucide-react";

import type { CmsModuleKey } from "@/lib/cms/define-config";
import type { Permission } from "@/types/user";

/**
 * Admin sidebar definition.
 *
 * The sidebar is data, not markup (§4: "the sidebar must be configurable").
 * Items disappear when their module is switched off in cms.config.ts or when
 * the signed-in user lacks the permission.
 *
 * `status: "planned"` marks a screen that exists in the roadmap but not yet in
 * the code. It renders greyed out with a "Soon" tag rather than as a link that
 * 404s — a disabled item is honest, a dead link is not (§28).
 */
export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  module: CmsModuleKey;
  permission: Permission;
  status?: "ready" | "planned";
  /** Match child routes too, e.g. /admin/pages/new highlights "Pages". */
  matchPrefix?: boolean;
}

export interface AdminNavGroup {
  label: string | null;
  items: AdminNavItem[];
}

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: null,
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
        module: "pages",
        permission: "pages.read",
      },
    ],
  },
  {
    label: "Content",
    items: [
      {
        label: "Pages",
        href: "/admin/pages",
        icon: FileText,
        module: "pages",
        permission: "pages.read",
        matchPrefix: true,
      },
      {
        label: "Blog",
        href: "/admin/blog",
        icon: BookOpen,
        module: "blog",
        permission: "blog.read",
        matchPrefix: true,
      },
      {
        label: "Media",
        href: "/admin/media",
        icon: ImageIcon,
        module: "media",
        permission: "media.read",
        matchPrefix: true,
      },
      {
        label: "Destinations",
        href: "/admin/destinations",
        icon: MapPinned,
        module: "destinations",
        permission: "destinations.read",
        matchPrefix: true,
      },
      {
        label: "Tour Packages",
        href: "/admin/tours",
        icon: Compass,
        module: "tours",
        permission: "tours.read",
        matchPrefix: true,
      },
      {
        label: "Activities",
        href: "/admin/activities",
        icon: Footprints,
        module: "activities",
        permission: "activities.read",
        matchPrefix: true,
      },
      {
        label: "Testimonials",
        href: "/admin/testimonials",
        icon: Quote,
        module: "testimonials",
        permission: "testimonials.read",
        matchPrefix: true,
      },
      {
        label: "FAQs",
        href: "/admin/faqs",
        icon: MessageSquareQuote,
        module: "faqs",
        permission: "faqs.read",
        matchPrefix: true,
      },
    ],
  },
  {
    label: "Website",
    items: [
      {
        label: "Navigation",
        href: "/admin/navigation",
        icon: Navigation,
        module: "navigation",
        permission: "navigation.read",
        matchPrefix: true,
      },
      {
        label: "Header",
        href: "/admin/settings/header",
        icon: PanelTop,
        module: "settings",
        permission: "settings.read",
        status: "planned",
      },
      {
        label: "Footer",
        href: "/admin/settings/footer",
        icon: PanelBottom,
        module: "settings",
        permission: "settings.read",
        status: "planned",
      },
      {
        label: "SEO",
        href: "/admin/seo",
        icon: Search,
        module: "seo",
        permission: "seo.read",
      },
      {
        label: "Redirects",
        href: "/admin/redirects",
        icon: Link2,
        module: "redirects",
        permission: "redirects.read",
        matchPrefix: true,
      },
      {
        label: "Site Settings",
        href: "/admin/settings",
        icon: Settings,
        module: "settings",
        permission: "settings.read",
      },
    ],
  },
  {
    label: "Bookings",
    items: [
      {
        label: "Enquiries",
        href: "/admin/enquiries",
        icon: Inbox,
        module: "enquiries",
        permission: "enquiries.read",
        matchPrefix: true,
      },
      {
        label: "Bookings",
        href: "/admin/bookings",
        icon: CalendarCheck,
        module: "bookings",
        permission: "bookings.read",
        status: "planned",
        matchPrefix: true,
      },
      {
        label: "Customers",
        href: "/admin/customers",
        icon: Building2,
        module: "customers",
        permission: "customers.read",
        status: "planned",
        matchPrefix: true,
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "Users",
        href: "/admin/users",
        icon: Users,
        module: "users",
        permission: "users.read",
        matchPrefix: true,
      },
      {
        label: "Roles & Permissions",
        href: "/admin/roles",
        icon: ShieldCheck,
        module: "roles",
        permission: "roles.read",
      },
      {
        label: "Integrations",
        href: "/admin/integrations",
        icon: Plug,
        module: "integrations",
        permission: "integrations.read",
        status: "planned",
      },
      {
        label: "Connections",
        href: "/admin/settings/connections",
        icon: Share2,
        module: "database",
        permission: "database.read",
      },
      {
        label: "Database",
        href: "/admin/database",
        icon: Database,
        module: "database",
        permission: "database.read",
      },
      {
        label: "Developer",
        href: "/admin/developer",
        icon: Terminal,
        module: "developer",
        permission: "developer.read",
      },
    ],
  },
];
