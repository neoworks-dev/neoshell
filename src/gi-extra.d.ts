// The parts of introspected libraries the shell uses that gjs-esm-types does
// not ship: libical's GObject API for calendar feeds, and libsecret for the
// keyring. Only what is called is declared.

declare module 'gi://ICalGLib?version=4.0' {
  namespace ICalGLib {
    enum ComponentKind {
      VCALENDAR_COMPONENT,
      VEVENT_COMPONENT,
    }
    enum PropertyKind {
      EXDATE_PROPERTY,
      RRULE_PROPERTY,
    }
    enum PropertyStatus {
      CANCELLED,
    }
    class Timezone {
      get_tzid(): string | null
    }
    class Time {
      is_null_time(): boolean
      is_date(): boolean
      get_timezone(): Timezone | null
      get_year(): number
      get_month(): number
      get_day(): number
      get_hour(): number
      get_minute(): number
      get_second(): number
      as_timet_with_zone(zone: Timezone | null): number
    }
    class Recurrence {}
    class RecurIterator {
      static new(rule: Recurrence, start: Time): RecurIterator
      next(): Time | null
    }
    class Property {
      get_rrule(): Recurrence
      get_exdate(): Time
    }
    class Component {
      static new_from_string(text: string): Component | null
      isa(): ComponentKind
      get_first_component(kind: ComponentKind): Component | null
      get_next_component(kind: ComponentKind): Component | null
      get_first_property(kind: PropertyKind): Property | null
      get_next_property(kind: PropertyKind): Property | null
      get_dtstart(): Time
      get_dtend(): Time
      get_recurrenceid(): Time
      get_uid(): string | null
      get_summary(): string | null
      get_location(): string | null
      get_status(): PropertyStatus
    }
  }
  export default ICalGLib
}

declare module 'gi://Secret?version=1' {
  import type Gio from 'gi://Gio?version=2.0'

  namespace Secret {
    const COLLECTION_DEFAULT: string
    enum SchemaFlags {
      NONE,
    }
    enum SchemaAttributeType {
      STRING,
    }
    class Schema {
      static new(name: string, flags: SchemaFlags, attributes: Record<string, SchemaAttributeType>): Schema
    }
    type Callback = (source: unknown, result: Gio.AsyncResult) => void
    function password_store(
      schema: Schema,
      attributes: Record<string, string>,
      collection: string | null,
      label: string,
      password: string,
      cancellable: Gio.Cancellable | null,
      callback: Callback,
    ): void
    function password_store_finish(result: Gio.AsyncResult): boolean
    function password_lookup(
      schema: Schema,
      attributes: Record<string, string>,
      cancellable: Gio.Cancellable | null,
      callback: Callback,
    ): void
    function password_lookup_finish(result: Gio.AsyncResult): string | null
    function password_clear(
      schema: Schema,
      attributes: Record<string, string>,
      cancellable: Gio.Cancellable | null,
      callback: Callback,
    ): void
    function password_clear_finish(result: Gio.AsyncResult): boolean
  }
  export default Secret
}
