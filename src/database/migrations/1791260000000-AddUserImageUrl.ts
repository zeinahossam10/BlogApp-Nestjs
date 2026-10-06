import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserImageUrl1791260000000 implements MigrationInterface {
  name = 'AddUserImageUrl1791260000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" ADD "imageUrl" character varying',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "imageUrl"');
  }
}
