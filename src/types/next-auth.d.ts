import "next-auth";
import "next-auth/jwt";
import type { Module, Action } from "@/lib/constants";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      avatar: string | null;
      role: string;
      roleId: string;
      permissions: `${Module}:${Action}`[];
    };
  }
  interface User {
    avatar: string | null;
    role: string;
    roleId: string;
    permissions: `${Module}:${Action}`[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    avatar: string | null;
    role: string;
    roleId: string;
    permissions: `${Module}:${Action}`[];
  }
}
