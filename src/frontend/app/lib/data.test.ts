import { describe, it, expect } from 'vitest';
import { formatRawProperty } from './data';

// Helper to create a mock Decimal-like object
const decimal = (n: number) => ({ toNumber: () => n });
// Helper to create a mock Date-like object
const dateObj = (s: string) => ({ toDateString: () => s });

describe('formatRawProperty', () => {
  it('handles all field types correctly', () => {
    const raw = {
      id: 'test-1',
      status: 'open',
      price: decimal(2500),
      bathrooms: decimal(1.5),
      latitude: 40.73,
      longitude: -73.93,
      listed_at: dateObj('Mon Jan 01 2024'),
      closed_at: dateObj('Fri Feb 02 2024'),
      available_from: dateObj('Wed Mar 15 2024'),
      loaded_datetime: dateObj('Thu Apr 01 2024'),
      date: dateObj('Fri May 01 2024'),
      brokers_fee: decimal(0.15),
      tag_list: ['luxury', 'renovated'],
      additional_fees: { move_in: 500 },
    };

    const result = formatRawProperty(raw);

    expect(result.price).toBe(2500);
    expect(result.bathrooms).toBe(1.5);
    expect(result.latitude).toBe('40.73');
    expect(result.longitude).toBe('-73.93');
    expect(result.listed_at).toBe('Mon Jan 01 2024');
    expect(result.closed_at).toBe('Fri Feb 02 2024');
    expect(result.available_from).toBe('Wed Mar 15 2024');
    expect(result.loaded_datetime).toBe('Thu Apr 01 2024');
    expect(result.date).toBe('Fri May 01 2024');
    expect(result.brokers_fee).toBe(0.15);
    expect(result.tag_list).toEqual(['luxury', 'renovated']);
    expect(result.additional_fees).toEqual({ move_in: 500 });
  });

  it('handles null/missing fields with defaults', () => {
    const raw = {
      id: 'test-2',
      status: 'open',
      // All nullable fields omitted
    };

    const result = formatRawProperty(raw);

    expect(result.price).toBe(0);
    expect(result.bathrooms).toBeNull();
    expect(result.latitude).toBe('0');
    expect(result.longitude).toBe('0');
    expect(result.listed_at).toBe('');
    expect(result.closed_at).toBe('');
    expect(result.available_from).toBe('');
    expect(result.loaded_datetime).toBe('');
    expect(result.date).toBe('');
    expect(result.brokers_fee).toBeNull();
    expect(result.tag_list).toEqual([]);
    expect(result.additional_fees).toBeNull();
  });

  it('handles empty tag_list', () => {
    const raw = {
      tag_list: [],
    };

    const result = formatRawProperty(raw);
    expect(result.tag_list).toEqual([]);
  });
});
