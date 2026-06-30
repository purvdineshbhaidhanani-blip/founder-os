import { generateId, nowIso } from "../utils/id.js";
import type { Timestamp } from "../types/common.js";

/**
 * Company Operating System — the canonical record of every department, team,
 * project, epic, feature, task, sprint, milestone and release. Stored in
 * memory as typed maps; persisted by the caller through the Memory Engine.
 */

export interface Department {
  id: string;
  name: string;
  description: string;
  lead?: string;
  agents: string[];
  createdAt: Timestamp;
}

export interface Team {
  id: string;
  name: string;
  department: string;
  lead?: string;
  members: string[];
  createdAt: Timestamp;
}

export type ProjectStatus = "planning" | "active" | "paused" | "shipped" | "archived";

export interface Project {
  id: string;
  name: string;
  goal: string;
  status: ProjectStatus;
  ownerTeam?: string;
  startedAt?: Timestamp;
  targetDate?: Timestamp;
  createdAt: Timestamp;
}

export interface Epic {
  id: string;
  projectId: string;
  name: string;
  description: string;
  status: ProjectStatus;
  createdAt: Timestamp;
}

export interface Feature {
  id: string;
  epicId: string;
  name: string;
  description: string;
  status: ProjectStatus;
  createdAt: Timestamp;
}

export interface Task {
  id: string;
  featureId?: string;
  projectId: string;
  title: string;
  assignedAgent?: string;
  status: "todo" | "in-progress" | "blocked" | "done";
  createdAt: Timestamp;
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  startsAt: Timestamp;
  endsAt: Timestamp;
  goal: string;
  taskIds: string[];
}

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  date: Timestamp;
  status: "upcoming" | "reached" | "missed";
}

export interface Release {
  id: string;
  projectId: string;
  version: string;
  notes: string;
  releasedAt: Timestamp;
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
}

export interface Policy {
  id: string;
  topic: string;
  rule: string;
  appliesTo: string[];
  createdAt: Timestamp;
}

export class CompanyOS {
  private departments = new Map<string, Department>();
  private teams = new Map<string, Team>();
  private projects = new Map<string, Project>();
  private epics = new Map<string, Epic>();
  private features = new Map<string, Feature>();
  private tasks = new Map<string, Task>();
  private sprints = new Map<string, Sprint>();
  private milestones = new Map<string, Milestone>();
  private releases = new Map<string, Release>();
  private roles = new Map<string, Role>();
  private policies = new Map<string, Policy>();

  addDepartment(input: Omit<Department, "id" | "createdAt">): Department {
    const dept: Department = { id: generateId("dept"), createdAt: nowIso(), ...input };
    this.departments.set(dept.id, dept);
    return dept;
  }

  addTeam(input: Omit<Team, "id" | "createdAt">): Team {
    const team: Team = { id: generateId("team"), createdAt: nowIso(), ...input };
    this.teams.set(team.id, team);
    return team;
  }

  addProject(input: Omit<Project, "id" | "createdAt">): Project {
    const project: Project = { id: generateId("proj"), createdAt: nowIso(), ...input };
    this.projects.set(project.id, project);
    return project;
  }

  addEpic(input: Omit<Epic, "id" | "createdAt">): Epic {
    const epic: Epic = { id: generateId("epic"), createdAt: nowIso(), ...input };
    this.epics.set(epic.id, epic);
    return epic;
  }

  addFeature(input: Omit<Feature, "id" | "createdAt">): Feature {
    const feature: Feature = { id: generateId("feat"), createdAt: nowIso(), ...input };
    this.features.set(feature.id, feature);
    return feature;
  }

  addTask(input: Omit<Task, "id" | "createdAt">): Task {
    const task: Task = { id: generateId("task"), createdAt: nowIso(), ...input };
    this.tasks.set(task.id, task);
    return task;
  }

  addSprint(input: Omit<Sprint, "id">): Sprint {
    const sprint: Sprint = { id: generateId("sprint"), ...input };
    this.sprints.set(sprint.id, sprint);
    return sprint;
  }

  addMilestone(input: Omit<Milestone, "id">): Milestone {
    const milestone: Milestone = { id: generateId("ms"), ...input };
    this.milestones.set(milestone.id, milestone);
    return milestone;
  }

  addRelease(input: Omit<Release, "id">): Release {
    const release: Release = { id: generateId("rel"), ...input };
    this.releases.set(release.id, release);
    return release;
  }

  defineRole(input: Omit<Role, "id">): Role {
    const role: Role = { id: generateId("role"), ...input };
    this.roles.set(role.id, role);
    return role;
  }

  recordPolicy(input: Omit<Policy, "id" | "createdAt">): Policy {
    const policy: Policy = { id: generateId("pol"), createdAt: nowIso(), ...input };
    this.policies.set(policy.id, policy);
    return policy;
  }

  // Listings & queries
  listDepartments(): Department[] { return [...this.departments.values()]; }
  listTeams(): Team[] { return [...this.teams.values()]; }
  listProjects(filter?: { status?: ProjectStatus }): Project[] {
    const all = [...this.projects.values()];
    return filter?.status ? all.filter((p) => p.status === filter.status) : all;
  }
  getProject(id: string): Project | undefined { return this.projects.get(id); }
  listEpics(projectId?: string): Epic[] {
    const all = [...this.epics.values()];
    return projectId ? all.filter((e) => e.projectId === projectId) : all;
  }
  listFeatures(epicId?: string): Feature[] {
    const all = [...this.features.values()];
    return epicId ? all.filter((f) => f.epicId === epicId) : all;
  }
  listTasks(projectId?: string): Task[] {
    const all = [...this.tasks.values()];
    return projectId ? all.filter((t) => t.projectId === projectId) : all;
  }
  listSprints(projectId?: string): Sprint[] {
    const all = [...this.sprints.values()];
    return projectId ? all.filter((s) => s.projectId === projectId) : all;
  }
  listMilestones(projectId?: string): Milestone[] {
    const all = [...this.milestones.values()];
    return projectId ? all.filter((m) => m.projectId === projectId) : all;
  }
  listReleases(projectId?: string): Release[] {
    const all = [...this.releases.values()];
    return projectId ? all.filter((r) => r.projectId === projectId) : all;
  }
  listRoles(): Role[] { return [...this.roles.values()]; }
  listPolicies(): Policy[] { return [...this.policies.values()]; }

  setProjectStatus(projectId: string, status: ProjectStatus): Project {
    const project = this.projects.get(projectId);
    if (!project) throw new Error(`Unknown project "${projectId}"`);
    project.status = status;
    return project;
  }

  setTaskStatus(taskId: string, status: Task["status"]): Task {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Unknown task "${taskId}"`);
    task.status = status;
    return task;
  }
}
