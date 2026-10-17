import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTodos1792195200000 implements MigrationInterface {
  name = 'CreateTodos1792195200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."todo_status" AS ENUM ('To Do', 'In Progress', 'Done')
    `);
    await queryRunner.query(`
      CREATE TABLE "public"."todos" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" text NOT NULL,
        "status" "public"."todo_status" NOT NULL DEFAULT 'To Do',
        CONSTRAINT "PK_todos" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_todos_title_not_blank" CHECK (length(btrim("title")) > 0)
      )
    `);
    // NestJS uses the database role; browser clients must go through the backend.
    await queryRunner.query('ALTER TABLE "public"."todos" ENABLE ROW LEVEL SECURITY');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "public"."todos"');
    await queryRunner.query('DROP TYPE "public"."todo_status"');
  }
}
