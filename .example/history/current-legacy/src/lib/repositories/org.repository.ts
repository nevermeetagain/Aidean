import { prisma } from "@/lib/db/prisma";
import { BaseRepository } from "./base.repository";
import type { Department, Team } from "@prisma/client";

export class DepartmentRepository extends BaseRepository<Department> {
  protected model = prisma.department;
}

export class TeamRepository extends BaseRepository<Team> {
  protected model = prisma.team;
}

