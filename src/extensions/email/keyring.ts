import Secret from 'gi://Secret?version=1'

// A mail account's password lives in the Secret Service keyring (KWallet,
// GNOME Keyring), keyed by the account's id. Config only names the account.

const SCHEMA = Secret.Schema.new('dev.neoworks.neoshell.Email', Secret.SchemaFlags.NONE, {
  account: Secret.SchemaAttributeType.STRING,
})

export function storePassword(accountId: string, label: string, password: string): Promise<void> {
  return new Promise((resolve, reject) => {
    Secret.password_store(
      SCHEMA,
      { account: accountId },
      Secret.COLLECTION_DEFAULT,
      `neoshell mail "${label}"`,
      password,
      null,
      (_source, result) => settle(() => Secret.password_store_finish(result), () => resolve(), reject),
    )
  })
}

// null when the keyring holds nothing for the account.
export function lookupPassword(accountId: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    Secret.password_lookup(SCHEMA, { account: accountId }, null, (_source, result) =>
      settle(() => Secret.password_lookup_finish(result), resolve, reject),
    )
  })
}

export function clearPassword(accountId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    Secret.password_clear(SCHEMA, { account: accountId }, null, (_source, result) =>
      settle(() => Secret.password_clear_finish(result), () => resolve(), reject),
    )
  })
}

function settle<Result>(
  finish: () => Result,
  resolve: (value: Result) => void,
  reject: (error: unknown) => void,
): void {
  try {
    resolve(finish())
  } catch (error) {
    reject(error)
  }
}
