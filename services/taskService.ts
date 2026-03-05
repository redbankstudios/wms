import { Task } from "../types";
import { mockTasks } from "../mock/tasks";

let tasksStore: Task[] = [...mockTasks];

export const taskService = {
  async getTasksByTenant(tenantId: string): Promise<Task[]> {
    return tasksStore.filter(t => t.tenantId === tenantId);
  },

  async getAllTasks(): Promise<Task[]> {
    return [...tasksStore];
  },

  async createTask(task: Omit<Task, "id">): Promise<Task> {
    const newTask: Task = { ...task, id: `TSK-${Date.now()}` };
    tasksStore = [newTask, ...tasksStore];
    return newTask;
  },

  async updateTask(taskId: string, updates: Partial<Omit<Task, "id">>): Promise<void> {
    tasksStore = tasksStore.map(t => t.id === taskId ? { ...t, ...updates } : t);
  },

  async updateTaskStatus(taskId: string, status: Task["status"]): Promise<void> {
    tasksStore = tasksStore.map(t => t.id === taskId ? { ...t, status } : t);
  },

  async deleteTask(taskId: string): Promise<void> {
    tasksStore = tasksStore.filter(t => t.id !== taskId);
  },
};
