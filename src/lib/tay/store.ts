"use client";

import { create } from "zustand";
import {
  type Milestones,
  type NextAction,
  calculateRealProgress,
  getNextExecutionAction,
  getExecutionMessage,
  getPlaybookLabel,
} from "./works";

interface TayWorksState {
  executionState: "idle" | "active" | "complete";
  workflowName: string;
  progress: number;
  milestones: Milestones;
  nextAction: NextAction | null;
  message: string;
  hesitating: boolean;
  startedAt: number | null;
  lastActionAt: number | null;
  startWork: (pathKey: string) => void;
  markMilestone: (key: keyof Milestones) => void;
  resetWork: () => void;
  tickHesitation: () => void;
}

const HESITATION_MS = 30_000;

export const useTayWorksStore = create<TayWorksState>((set, get) => ({
  executionState: "idle",
  workflowName: "",
  progress: 0,
  milestones: {},
  nextAction: getNextExecutionAction({}),
  message: getExecutionMessage(0, false),
  hesitating: false,
  startedAt: null,
  lastActionAt: null,

  startWork: (pathKey) => {
    if (get().executionState === "active") return;
    const now = Date.now();
    set({
      executionState: "active",
      workflowName: getPlaybookLabel(pathKey),
      progress: 0,
      milestones: {},
      nextAction: getNextExecutionAction({}),
      message: getExecutionMessage(0, false),
      hesitating: false,
      startedAt: now,
      lastActionAt: now,
    });
  },

  markMilestone: (key) => {
    const state = get();
    if (state.executionState === "idle") return;
    const next: Milestones = { ...state.milestones };
    if (key === "postCreated") {
      next.postCreated = true;
      next.totalPosts = (next.totalPosts || 0) + 1;
    } else if (key === "leadAdded") {
      next.leadAdded = true;
      next.totalLeads = (next.totalLeads || 0) + 1;
    } else if (key === "conversationLogged") {
      next.conversationLogged = true;
      next.totalConversations = (next.totalConversations || 0) + 1;
    } else if (key === "dealClosed") {
      next.dealClosed = true;
      next.totalDeals = (next.totalDeals || 0) + 1;
    }
    const progress = calculateRealProgress(next);
    set({
      milestones: next,
      progress,
      nextAction: getNextExecutionAction(next),
      message: getExecutionMessage(progress, false),
      hesitating: false,
      lastActionAt: Date.now(),
      executionState: progress >= 100 ? "complete" : "active",
    });
  },

  resetWork: () =>
    set({
      executionState: "idle",
      workflowName: "",
      progress: 0,
      milestones: {},
      nextAction: getNextExecutionAction({}),
      message: getExecutionMessage(0, false),
      hesitating: false,
      startedAt: null,
      lastActionAt: null,
    }),

  tickHesitation: () => {
    const state = get();
    if (state.executionState !== "active" || !state.lastActionAt) return;
    const isHesitating = Date.now() - state.lastActionAt > HESITATION_MS;
    if (isHesitating !== state.hesitating) {
      set({
        hesitating: isHesitating,
        message: getExecutionMessage(state.progress, isHesitating),
      });
    }
  },
}));
