import { Test, TestingModule } from '@nestjs/testing';
import { FavoritesController } from './favorites.controller.js';
import { FavoritesService } from './favorites.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard.js';

describe('FavoritesController', () => {
  let controller: FavoritesController;
  const service = {
    getFavorites: vi.fn().mockResolvedValue([]),
    addFavorite: vi.fn().mockResolvedValue({ id: 1 }),
    removeFavorite: vi.fn().mockResolvedValue({ message: 'ok' }),
  };
  const req = { user: { id: 7 } };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FavoritesController],
      providers: [{ provide: FavoritesService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FavoritesController>(FavoritesController);
  });

  it('lists the current user favorites', async () => {
    await controller.getFavorites(req);
    expect(service.getFavorites).toHaveBeenCalledWith(7);
  });

  it('adds a favorite', async () => {
    await controller.addFavorite(3, req);
    expect(service.addFavorite).toHaveBeenCalledWith(7, 3);
  });

  it('removes a favorite', async () => {
    await controller.removeFavorite(3, req);
    expect(service.removeFavorite).toHaveBeenCalledWith(7, 3);
  });
});
