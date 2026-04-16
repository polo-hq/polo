import * as fs from "node:fs";
import * as path from "node:path";
import YAML from "yaml";

export interface TaskAssertion {
  type: string;
  value?: string;
}

export interface EvalTask {
  task: string;
  assert: TaskAssertion[];
}

export interface ChatScenario {
  name: string;
  turns: string[];
}

interface TasksFile {
  category: string;
  tasks?: EvalTask[];
  chat_scenarios?: ChatScenario[];
}

export interface CategoryTasks {
  category: string;
  tasks: EvalTask[];
}

export interface ChatCategory {
  category: string;
  chatScenarios: ChatScenario[];
}

export function loadTaskFile(filePath: string): TasksFile {
  const parsed = YAML.parse(fs.readFileSync(filePath, "utf8")) as TasksFile | null;
  if (!parsed || typeof parsed !== "object") {
    throw new Error(`Invalid task file: ${filePath}`);
  }
  return parsed;
}

export function loadV2TaskSuite(tasksDir: string): {
  synthesis: CategoryTasks;
  lookup: CategoryTasks;
  chat: ChatCategory;
} {
  const synthesis = loadTaskFile(path.join(tasksDir, "synthesis.yaml"));
  const lookup = loadTaskFile(path.join(tasksDir, "lookup.yaml"));
  const chat = loadTaskFile(path.join(tasksDir, "chat.yaml"));

  return {
    synthesis: {
      category: synthesis.category,
      tasks: synthesis.tasks ?? [],
    },
    lookup: {
      category: lookup.category,
      tasks: lookup.tasks ?? [],
    },
    chat: {
      category: chat.category,
      chatScenarios: chat.chat_scenarios ?? [],
    },
  };
}
