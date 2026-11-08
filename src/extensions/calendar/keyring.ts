import Secret from 'gi://Secret?version=1'

// A calendar's feed URL is a credential — Google's "secret address" lets
// anyone holding it read the whole calendar — so it lives in the Secret
// Service keyring (KWallet, GNOME Keyring), keyed by the calendar's id. Config
// only names the calendar.

const SCHEMA = Secret.Schema.new('dev.neoworks.neoshell.Calendar', Secret.SchemaFlags.NONE, {
  calendar: Secret.SchemaAttributeType.STRING,
})

export function storeFeedUrl(calendarId: string, name: string, url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    Secret.password_store(
      SCHEMA,
      { calendar: calendarId },
      Secret.COLLECTION_DEFAULT,
      `neoshell calendar "${name}"`,
      url,
      null,
      (_source, result) => settle(() => Secret.password_store_finish(result), () => resolve(), reject),
    )
  })
}

// null when the keyring holds nothing for the calendar.
export function lookupFeedUrl(calendarId: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    Secret.password_lookup(SCHEMA, { calendar: calendarId }, null, (_source, result) =>
      settle(() => Secret.password_lookup_finish(result), resolve, reject),
    )
  })
}

export function clearFeedUrl(calendarId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    Secret.password_clear(SCHEMA, { calendar: calendarId }, null, (_source, result) =>
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
