/*
 * Copyright 2023 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { startTestBackend } from '@backstage/backend-test-utils';
import { schedulerFactory } from './schedulerFactory';

describe('schedulerFactory', () => {
  it('creates sidecar database features', async () => {
    expect.assertions(3);

    const subject = schedulerFactory();

    const plugin = createBackendPlugin({
      id: 'example',
      register(reg) {
        reg.registerInit({
          deps: {
            scheduler: subject.service,
            database: coreServices.database,
          },
          init: async ({ scheduler, database }) => {
            await scheduler.scheduleTask({
              id: 'task1',
              timeout: { seconds: 1 },
              frequency: { seconds: 1 },
              fn: async () => {},
            });

            const client = await database.getClient();
            await expect(
              client.from('backstage_backend_tasks__tasks').count(),
            ).resolves.toEqual([{ 'count(*)': 1 }]);
            await expect(
              client.from('backstage_backend_tasks__knex_migrations').count(),
            ).resolves.toEqual([{ 'count(*)': expect.any(Number) }]);
            await expect(
              client
                .from('backstage_backend_tasks__knex_migrations_lock')
                .count(),
            ).resolves.toEqual([{ 'count(*)': expect.any(Number) }]);
          },
        });
      },
    });

    await startTestBackend({
      features: [plugin()],
      services: [subject],
    });
  });
});