// Test script for playtime validation
import { reviewSchema, playtimeSchema } from './src/utils/validation.js';

console.log('Testing Playtime Validation\n');
console.log('=' .repeat(50));

// Test cases for standalone playtime validation
const testCases = [
  { value: 0, expected: 'valid', description: 'Zero hours (minimum valid)' },
  { value: 100, expected: 'valid', description: 'Normal playtime (100 hours)' },
  { value: 1000, expected: 'valid', description: 'High playtime (1000 hours)' },
  { value: 50000, expected: 'valid', description: 'Maximum allowed (50,000 hours)' },
  { value: -1, expected: 'invalid', description: 'Negative value' },
  { value: 50001, expected: 'invalid', description: 'Above maximum' },
  { value: 3.5, expected: 'invalid', description: 'Decimal value' },
  { value: null, expected: 'valid', description: 'Null value (optional)' },
  { value: undefined, expected: 'valid', description: 'Undefined (optional)' },
];

console.log('\nStandalone Playtime Validation Tests:');
console.log('-'.repeat(50));

testCases.forEach(test => {
  try {
    const result = playtimeSchema.parse(test.value);
    const status = test.expected === 'valid' ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} | ${test.description}`);
    console.log(`  Input: ${test.value}, Result: ${result}`);
  } catch (error) {
    const status = test.expected === 'invalid' ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} | ${test.description}`);
    console.log(`  Input: ${test.value}, Error: ${error.errors?.[0]?.message || error.message}`);
  }
});

// Test cases for review schema with playtime
const reviewTestCases = [
  {
    data: {
      rating: 8.5,
      review: 'This is a great game that I really enjoyed playing!',
      finished: true,
      playtimeHours: 150
    },
    expected: 'valid',
    description: 'Complete review with valid playtime'
  },
  {
    data: {
      rating: 7,
      review: 'Good game but could be better in some areas.',
      finished: false,
      playtimeHours: -10
    },
    expected: 'invalid',
    description: 'Review with negative playtime'
  },
  {
    data: {
      rating: 9,
      review: 'Amazing experience from start to finish!',
      finished: true,
      playtimeHours: null
    },
    expected: 'valid',
    description: 'Review with null playtime (optional)'
  },
  {
    data: {
      rating: 6.5,
      review: 'Decent game but nothing special really.',
      finished: false
      // playtimeHours omitted
    },
    expected: 'valid',
    description: 'Review without playtime field'
  }
];

console.log('\n\nReview Schema with Playtime Tests:');
console.log('-'.repeat(50));

reviewTestCases.forEach(test => {
  try {
    const result = reviewSchema.parse(test.data);
    const status = test.expected === 'valid' ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} | ${test.description}`);
    console.log(`  Playtime: ${test.data.playtimeHours ?? 'not provided'}`);
  } catch (error) {
    const status = test.expected === 'invalid' ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} | ${test.description}`);
    console.log(`  Playtime: ${test.data.playtimeHours}, Error: ${error.errors?.[0]?.message || error.message}`);
  }
});

console.log('\n' + '='.repeat(50));
console.log('Validation tests complete!');