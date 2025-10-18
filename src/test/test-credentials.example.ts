/**
 * Example Test Credentials
 *
 * Copy this file to `test-credentials.ts` and fill in real credentials for testing.
 * The `test-credentials.ts` file is gitignored for security.
 */

export const testCredentials = {
  // Control account - working email login
  control: {
    email: 'hotboytime69@gmail.com',
    password: 'HotBoy456!',
    username: 'dothog',
    expectedUsername: 'dothog'
  },

  // Previously broken accounts - now should work with username login
  broken1: {
    email: 'thomas.waalkes+test7@gmail.com',
    password: 'HotBoy456!',
    username: 'majordangus',
    expectedUsername: 'majordangus'
  },

  broken2: {
    email: 'thomas.waalkes+test3@gmail.com',
    password: 'HotBoy456!',
    username: 'generalnotion',
    expectedUsername: 'generalnotion'
  },

  broken3: {
    email: 'thomas.waalkes+test2@gmail.com',
    password: 'HotBoy456!',
    username: 'dariusfudge',
    expectedUsername: 'dariusfudge'
  },

  broken4: {
    email: 'thomas.waalkes+createtest4@gmail.com',
    password: 'ElmoDid911!',
    username: 'aypieboybakemeapie911',
    expectedUsername: 'aypieboybakemeapie911'
  },

  // Additional test account
  additional: {
    email: 'joshuateusink@yahoo.com',
    password: 'rnkPX5&aD&+2G\'s',
    username: 'leroysdeath',
    expectedUsername: 'leroysdeath'
  }
};
