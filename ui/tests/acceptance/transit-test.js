import { click, fillIn, find, currentURL } from '@ember/test-helpers';
import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';
import { encodeString } from 'vault/utils/b64';
import authPage from 'vault/tests/pages/auth';
import logout from 'vault/tests/pages/logout';
import enablePage from 'vault/tests/pages/settings/mount-secret-backend';

module('Acceptance | transit', function(hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function() {
    return authPage.login();
  });

  hooks.afterEach(function() {
    return logout.visit();
  });

  let generateTransitKeys = () => {
    const ts = new Date().getTime();
    const keys = [
      {
        name: `aes-${ts}`,
        type: 'aes256-gcm96',
        exportable: true,
        supportsEncryption: true,
      },
      {
        name: `aes-convergent-${ts}`,
        type: 'aes256-gcm96',
        convergent: true,
        supportsEncryption: true,
      },
      {
        name: `chacha-${ts}`,
        type: 'chacha20-poly1305',
        exportable: true,
        supportsEncryption: true,
      },
      {
        name: `chacha-convergent-${ts}`,
        type: 'chacha20-poly1305',
        convergent: true,
        supportsEncryption: true,
      },
      {
        name: `ecdsa-${ts}`,
        type: 'ecdsa-p256',
        exportable: true,
        supportsSigning: true,
      },
      {
        name: `ed25519-${ts}`,
        type: 'ed25519',
        derived: true,
        supportsSigning: true,
      },
      {
        name: `rsa-2048-${ts}`,
        type: `rsa-2048`,
        supportsSigning: true,
        supportsEncryption: true,
      },
      {
        name: `rsa-4096-${ts}`,
        type: `rsa-4096`,
        supportsSigning: true,
        supportsEncryption: true,
      },
    ];

    keys.forEach(async key => {
      await click('[data-test-secret-create]');
      await fillIn('[data-test-transit-key-name]', key.name);
      await fillIn('[data-test-transit-key-type]', key.type);
      if (key.exportable) {
        await click('[data-test-transit-key-exportable]');
      }
      if (key.derived) {
        await click('[data-test-transit-key-derived]');
      }
      if (key.convergent) {
        await click('[data-test-transit-key-convergent-encryption]');
      }
      await click('[data-test-transit-key-create]');

      // link back to the list
      await click('[data-test-secret-root-link]');
    });
    return keys;
  };

  const testEncryption = (assert, keyName) => {
    const tests = [
      // raw bytes for plaintext and context
      {
        plaintext: 'NaXud2QW7KjyK6Me9ggh+zmnCeBGdG93LQED49PtoOI=',
        context: 'nqR8LiVgNh/lwO2rArJJE9F9DMhh0lKo4JX9DAAkCDw=',
        encodePlaintext: false,
        encodeContext: false,
        decodeAfterDecrypt: false,
        assertAfterEncrypt: key => {
          assert.ok(
            /vault:/.test(find('[data-test-transit-input="ciphertext"]').value),
            `${key}: ciphertext shows a vault-prefixed ciphertext`
          );
        },
        assertBeforeDecrypt: key => {
          assert
            .dom('[data-test-transit-input="context"]')
            .hasValue(
              'nqR8LiVgNh/lwO2rArJJE9F9DMhh0lKo4JX9DAAkCDw=',
              `${key}: the ui shows the base64-encoded context`
            );
        },

        assertAfterDecrypt: key => {
          assert
            .dom('[data-test-transit-input="plaintext"]')
            .hasValue(
              'NaXud2QW7KjyK6Me9ggh+zmnCeBGdG93LQED49PtoOI=',
              `${key}: the ui shows the base64-encoded plaintext`
            );
        },
      },
      // raw bytes for plaintext, string for context
      {
        plaintext: 'NaXud2QW7KjyK6Me9ggh+zmnCeBGdG93LQED49PtoOI=',
        context: encodeString('context'),
        encodePlaintext: false,
        encodeContext: false,
        decodeAfterDecrypt: false,
        assertAfterEncrypt: key => {
          assert.ok(
            /vault:/.test(find('[data-test-transit-input="ciphertext"]').value),
            `${key}: ciphertext shows a vault-prefixed ciphertext`
          );
        },
        assertBeforeDecrypt: key => {
          assert
            .dom('[data-test-transit-input="context"]')
            .hasValue(encodeString('context'), `${key}: the ui shows the input context`);
        },
        assertAfterDecrypt: key => {
          assert
            .dom('[data-test-transit-input="plaintext"]')
            .hasValue(
              'NaXud2QW7KjyK6Me9ggh+zmnCeBGdG93LQED49PtoOI=',
              `${key}: the ui shows the base64-encoded plaintext`
            );
        },
      },
      // base64 input
      {
        plaintext: encodeString('This is the secret'),
        context: encodeString('context'),
        encodePlaintext: false,
        encodeContext: false,
        decodeAfterDecrypt: true,
        assertAfterEncrypt: key => {
          assert.ok(
            /vault:/.test(find('[data-test-transit-input="ciphertext"]').value),
            `${key}: ciphertext shows a vault-prefixed ciphertext`
          );
        },
        assertBeforeDecrypt: key => {
          assert
            .dom('[data-test-transit-input="context"]')
            .hasValue(encodeString('context'), `${key}: the ui shows the input context`);
        },
        assertAfterDecrypt: key => {
          assert
            .dom('[data-test-transit-input="plaintext"]')
            .hasValue('This is the secret', `${key}: the ui decodes plaintext`);
        },
      },

      // string input
      {
        plaintext: 'There are many secrets 🤐',
        context: 'secret 2',
        encodePlaintext: true,
        encodeContext: true,
        decodeAfterDecrypt: true,
        assertAfterEncrypt: key => {
          assert.ok(findWithAssert('[data-test-transit-input="ciphertext"]'), `${key}: ciphertext box shows`);
          assert.ok(
            /vault:/.test(find('[data-test-transit-input="ciphertext"]').value),
            `${key}: ciphertext shows a vault-prefixed ciphertext`
          );
        },
        assertBeforeDecrypt: key => {
          assert
            .dom('[data-test-transit-input="context"]')
            .hasValue(encodeString('secret 2'), `${key}: the ui shows the encoded context`);
        },
        assertAfterDecrypt: key => {
          assert.ok(findWithAssert('[data-test-transit-input="plaintext"]'), `${key}: plaintext box shows`);
          assert
            .dom('[data-test-transit-input="plaintext"]')
            .hasValue('There are many secrets 🤐', `${key}: the ui decodes plaintext`);
        },
      },
    ];

    tests.forEach(async testCase => {
      await click('[data-test-transit-action-link="encrypt"]');
      await fillIn('[data-test-transit-input="plaintext"]', testCase.plaintext);
      await fillIn('[data-test-transit-input="context"]', testCase.context);
      if (testCase.encodePlaintext) {
        await click('[data-test-transit-b64-toggle="plaintext"]');
      }
      if (testCase.encodeContext) {
        await click('[data-test-transit-b64-toggle="context"]');
      }
      await click('button:contains(Encrypt)');
      if (testCase.assertAfterEncrypt) {
        testCase.assertAfterEncrypt(keyName);
      }
      await click('[data-test-transit-action-link="decrypt"]');
      if (testCase.assertBeforeDecrypt) {
        testCase.assertBeforeDecrypt(keyName);
      }
      await click('button:contains(Decrypt)');

      if (testCase.assertAfterDecrypt) {
        if (testCase.decodeAfterDecrypt) {
          await click('[data-test-transit-b64-toggle="plaintext"]');
          testCase.assertAfterDecrypt(keyName);
        } else {
          testCase.assertAfterDecrypt(keyName);
        }
      }
    });
  };
  test('transit backend', async function(assert) {
    assert.expect(49);
    const now = new Date().getTime();
    const transitPath = `transit-${now}`;

    await enablePage.visit().mount('transit', transitPath);

    // create a bunch of different kinds of keys
    const transitKeys = generateTransitKeys();

    transitKeys.forEach(async (key, index) => {
      await click(`[data-test-secret-link="${key.name}"]`);
      if (index === 0) {
        await click('[data-test-transit-link="versions"]');
        assert
          .dom('[data-test-transit-key-version-row]')
          .exists({ count: 1 }, `${key.name}: only one key version`);
        await click('[data-test-transit-key-rotate] button');
        await click('[data-test-confirm-button]');
        assert
          .dom('[data-test-transit-key-version-row]')
          .exists({ count: 2 }, `${key.name}: two key versions after rotate`);
      }
      await click('[data-test-transit-key-actions-link]');
      assert.ok(
        currentURL().startsWith(`/vault/secrets/${transitPath}/actions/${key.name}`),
        `${key.name}: navigates to tranist actions`
      );
      if (index === 0) {
        assert.ok(
          findWithAssert('[data-test-transit-key-version-select]'),
          `${key.name}: the rotated key allows you to select versions`
        );
      }
      if (key.exportable) {
        assert.ok(
          findWithAssert('[data-test-transit-action-link="export"]'),
          `${key.name}: exportable key has a link to export action`
        );
      } else {
        assert
          .dom('[data-test-transit-action-link="export"]')
          .doesNotExist(`${key.name}: non-exportable key does not link to export action`);
      }
      if (key.convergent && key.supportsEncryption) {
        testEncryption(assert, key.name);
      }
      await click('[data-test-secret-root-link]');
    });
  });
});
