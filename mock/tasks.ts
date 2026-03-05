import { Task } from "../types";

export const mockTasks: Task[] = [
  { id: "TSK-1042", tenantId: "tenant-1", type: "Pick", status: "pending", assignee: "Unassigned", location: "Zone A • Aisle 04", items: 3, priority: "high" },
  { id: "TSK-1043", tenantId: "tenant-1", type: "Putaway", status: "in_progress", assignee: "Mike D.", location: "Rec Dock • Door 2", items: 12, priority: "normal" },
  { id: "TSK-1044", tenantId: "tenant-1", type: "Pick", status: "pending", assignee: "Sarah J.", location: "Zone B • Aisle 01", items: 1, priority: "normal" },
  { id: "TSK-1045", tenantId: "tenant-1", type: "Pack", status: "completed", assignee: "Tom W.", location: "Pack Station 3", items: 5, priority: "normal" },
  { id: "TSK-1046", tenantId: "tenant-1", type: "Receive", status: "in_progress", assignee: "Alex R.", location: "Rec Dock • Door 1", items: 24, priority: "urgent" },
  { id: "TSK-1047", tenantId: "tenant-1", type: "Return", status: "pending", assignee: "Unassigned", location: "Return Station 1", items: 2, priority: "normal" },
];
