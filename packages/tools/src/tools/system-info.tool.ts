import { z } from "zod";
import { tool } from "ai";
import { GridTool } from "../types";
import { platform, arch, cpus, totalmem, freemem, homedir } from "os";

/**
 * System information tool
 */
export const toolDefinition = {
  name: "systemInfo",
  description: "Get system and environment information",
  inputSchema: z.object({
    info: z.enum([
      "os",
      "memory",
      "cpu",
      "node",
      "env_vars",
      "uptime"
    ]).describe("Type of system information to retrieve")
  }),
};

export const systemInfoToolWithoutExecute = tool(toolDefinition);

export const systemInfoToolWithExecute = tool({
  ...toolDefinition,
  execute: async ({ info }) => {
    switch (info) {
      case "os":
        return {
          platform: platform(),
          arch: arch(),
          homedir: homedir(),
          hostname: process.env.HOSTNAME || "unknown"
        };
      
      case "memory":
        const totalMem = totalmem();
        const freeMem = freemem();
        const usedMem = totalMem - freeMem;
        
        return {
          total: {
            bytes: totalMem,
            gb: `${(totalMem / 1024 / 1024 / 1024).toFixed(2)} GB`
          },
          free: {
            bytes: freeMem,
            gb: `${(freeMem / 1024 / 1024 / 1024).toFixed(2)} GB`
          },
          used: {
            bytes: usedMem,
            gb: `${(usedMem / 1024 / 1024 / 1024).toFixed(2)} GB`
          },
          percentage: `${((usedMem / totalMem) * 100).toFixed(1)}%`
        };
      
      case "cpu":
        const cpuInfo = cpus();
        return {
          cores: cpuInfo.length,
          model: cpuInfo[0]?.model,
          speed: cpuInfo[0]?.speed ? `${cpuInfo[0].speed} MHz` : "unknown",
          architecture: arch()
        };
      
      case "node":
        return {
          version: process.version,
          versions: {
            node: process.versions.node,
            v8: process.versions.v8,
            npm: process.versions.npm || "unknown"
          },
          execPath: process.execPath
        };
      
      case "env_vars":
        // Return only safe, non-sensitive env vars
        return {
          NODE_ENV: process.env.NODE_ENV || "development",
          PWD: process.env.PWD,
          USER: process.env.USER,
          SHELL: process.env.SHELL,
          LANG: process.env.LANG,
          TZ: process.env.TZ || "not set"
        };
      
      case "uptime":
        const uptimeSeconds = process.uptime();
        const days = Math.floor(uptimeSeconds / 86400);
        const hours = Math.floor((uptimeSeconds % 86400) / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const seconds = Math.floor(uptimeSeconds % 60);
        
        return {
          seconds: uptimeSeconds,
          formatted: `${days}d ${hours}h ${minutes}m ${seconds}s`,
          breakdown: { days, hours, minutes, seconds }
        };
      
      default:
        return { error: `Unknown info type: ${info}` };
    }
  }
});

export const systemInfoTool: GridTool = {
  withExecute: systemInfoToolWithExecute,
  withoutExecute: systemInfoToolWithoutExecute,
  definition: toolDefinition,
};