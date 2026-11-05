import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { getConfig, safeNext } from '../src/lib/config.ts';

test('missing or invalid Supabase settings disable connection', () => {
  assert.equal(getConfig({}), null);
  assert.equal(getConfig({ NEXT_PUBLIC_SUPABASE_URL: 'invalid', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'key' }), null);
  assert.equal(getConfig({ NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '' }), null);
});
test('valid public configuration supports publishable and legacy anon keys', () => {
  assert.deepEqual(getConfig({ NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-key' }), { url: 'https://test.supabase.co', key: 'public-key' });
  assert.equal(getConfig({ NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'legacy' })?.key, 'legacy');
});
test('auth redirects cannot leave the application', () => {
  for (const value of ['https://evil.example', '//evil.example', '/\\evil.example', '/%2fevil.example', '/%5cevil.example', '/login', '/auth/callback']) assert.equal(safeNext(value), '/dashboard');
  assert.equal(safeNext('/trades/new'), '/trades/new');
  assert.equal(safeNext(null), '/dashboard');
});
