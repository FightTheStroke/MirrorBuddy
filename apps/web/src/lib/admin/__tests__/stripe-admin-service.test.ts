import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Stripe SDK
const mockStripe = {
  products: {
    list: vi.fn(),
  },
  subscriptions: {
    list: vi.fn(),
  },
  prices: {
    list: vi.fn(),
  },
  balance: {
    retrieve: vi.fn(),
  },
};

vi.mock('@/lib/stripe/stripe-service', () => ({
  stripeService: {
    getServerClient: () => mockStripe,
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

import {
  getDashboardData,
  getProducts,
  getSubscriptions,
  formatCurrency,
  formatDate,
} from '../stripe-admin-service';

describe('stripe-admin-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDashboardData', () => {
    it('should return configured:false when STRIPE_SECRET_KEY not set', async () => {
      const originalEnv = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;

      const result = await getDashboardData();

      expect(result.configured).toBe(false);
      expect(result.products).toEqual([]);
      process.env.STRIPE_SECRET_KEY = originalEnv;
    });

    it('should return dashboard data when configured', async () => {
      const originalEnv = process.env.STRIPE_SECRET_KEY;
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';

      mockStripe.products.list.mockResolvedValue({
        data: [
          {
            id: 'prod_1',
            name: 'Pro',
            description: 'Pro plan',
            active: true,
            default_price: null,
            metadata: {},
            created: 1700000000,
          },
        ],
      });

      mockStripe.subscriptions.list.mockResolvedValue({
        data: [
          {
            id: 'sub_1',
            customer: { id: 'cus_1', email: 'test@example.com' },
            status: 'active',
            current_period_start: 1700000000,
            current_period_end: 1702592000,
            cancel_at_period_end: false,
            items: { data: [{ price: { id: 'price_1' }, quantity: 1 }] },
            metadata: {},
            created: 1700000000,
          },
        ],
      });

      mockStripe.balance.retrieve.mockResolvedValue({
        available: [{ amount: 50000 }],
      });

      const result = await getDashboardData();

      expect(result.configured).toBe(true);
      expect(result.products).toHaveLength(1);
      expect(result.subscriptions).toHaveLength(1);
      expect(result.revenue).toBeDefined();
      expect(result.revenue!.activeSubscriptions).toBe(1);

      process.env.STRIPE_SECRET_KEY = originalEnv;
    });

    it('should return error on SDK failure', async () => {
      const originalEnv = process.env.STRIPE_SECRET_KEY;
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';

      mockStripe.products.list.mockRejectedValue(new Error('API error'));

      const result = await getDashboardData();

      expect(result.configured).toBe(false);
      expect(result.error).toBe('Failed to fetch Stripe data');

      process.env.STRIPE_SECRET_KEY = originalEnv;
    });
  });

  describe('getProducts', () => {
    it('should return empty array when not configured', async () => {
      const originalEnv = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;

      const result = await getProducts();
      expect(result).toEqual([]);

      process.env.STRIPE_SECRET_KEY = originalEnv;
    });

    it('should return products with prices', async () => {
      const originalEnv = process.env.STRIPE_SECRET_KEY;
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';

      mockStripe.products.list.mockResolvedValue({
        data: [
          {
            id: 'prod_1',
            name: 'Pro',
            description: null,
            active: true,
            default_price: {
              id: 'price_1',
              product: 'prod_1',
              currency: 'eur',
              unit_amount: 999,
              recurring: { interval: 'month', interval_count: 1 },
              active: true,
              metadata: {},
            },
            metadata: {},
            created: 1700000000,
          },
        ],
      });

      mockStripe.prices.list.mockResolvedValue({ data: [] });

      const result = await getProducts();
      expect(result).toHaveLength(1);
      expect(result[0].prices).toHaveLength(1);
      expect(result[0].prices[0].unitAmount).toBe(999);

      process.env.STRIPE_SECRET_KEY = originalEnv;
    });
  });

  describe('getSubscriptions', () => {
    it('should return empty array when not configured', async () => {
      const originalEnv = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;

      const result = await getSubscriptions();
      expect(result).toEqual([]);

      process.env.STRIPE_SECRET_KEY = originalEnv;
    });
  });

  describe('formatCurrency', () => {
    it('should format cents to EUR', () => {
      const result = formatCurrency(999, 'EUR');
      expect(result).toContain('9,99');
    });

    it('should default to EUR', () => {
      const result = formatCurrency(1000);
      expect(result).toContain('10,00');
    });
  });

  describe('formatDate', () => {
    it('should format Unix timestamp', () => {
      const result = formatDate(1700000000);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });
});
