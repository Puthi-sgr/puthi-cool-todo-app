import 'reflect-metadata';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { databaseOptions } from './database.options.js';

await ConfigModule.forRoot();

export default new DataSource(databaseOptions(new ConfigService()));
