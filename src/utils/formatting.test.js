import { formatVipPromptMessage } from './formatting.js';

test('lifetime ABO display takes priority over an active temporary expiry', () => {
  const message = formatVipPromptMessage({
    farmId: 123,
    username: 'Farmer',
    isAbo: true,
    aboLifetime: true,
    aboExpiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000),
  });

  expect(message).toContain('Subscription: Lifetime');
  expect(message).not.toContain('Time remaining:');
  expect(message).not.toContain('Expires at:');
});
