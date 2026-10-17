import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;
  const appService = { getHello: vi.fn() };

  beforeEach(async () => {
    appService.getHello.mockReset().mockReturnValue('Controller test message');
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AppService, useValue: appService }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('returns the message supplied by AppService', () => {
      expect(appController.getHello()).toBe('Controller test message');
      expect(appService.getHello).toHaveBeenCalledOnce();
    });
  });
});
