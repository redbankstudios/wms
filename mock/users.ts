import { User } from "../types";

export const mockUsers: User[] = [
  // tenant-1 management
  { id: "USR-001", tenantId: "tenant-1", name: "Alice Admin",    email: "alice@techcorp.com",          role: "business_owner",    active: true  },
  { id: "USR-002", tenantId: "tenant-1", name: "Bob Carter",     email: "bob.carter@techcorp.com",     role: "warehouse_manager", active: true  },
  // tenant-1 warehouse staff
  { id: "USR-003", tenantId: "tenant-1", name: "Carol Pierce",   email: "carol.pierce@techcorp.com",   role: "warehouse_employee", active: true  },
  { id: "USR-004", tenantId: "tenant-1", name: "David Kim",      email: "david.kim@techcorp.com",      role: "warehouse_employee", active: true  },
  { id: "USR-005", tenantId: "tenant-1", name: "Emma Torres",    email: "emma.torres@techcorp.com",    role: "warehouse_employee", active: true  },
  { id: "USR-006", tenantId: "tenant-1", name: "Henry Walsh",    email: "h.walsh@techcorp.com",        role: "warehouse_employee", active: false },
  // tenant-1 packers
  { id: "USR-007", tenantId: "tenant-1", name: "Frank Chen",     email: "frank.chen@techcorp.com",     role: "packer",            active: true  },
  { id: "USR-008", tenantId: "tenant-1", name: "Grace Liu",      email: "grace.liu@techcorp.com",      role: "packer",            active: true  },
  { id: "USR-009", tenantId: "tenant-1", name: "Ivan Morales",   email: "ivan.morales@techcorp.com",   role: "packer",            active: false },
  // tenant-2
  { id: "USR-010", tenantId: "tenant-2", name: "Julia Bennett",  email: "julia@beanroasters.com",      role: "warehouse_manager", active: true  },
  { id: "USR-011", tenantId: "tenant-2", name: "Kyle Nguyen",    email: "kyle@beanroasters.com",       role: "warehouse_employee", active: true  },
];
