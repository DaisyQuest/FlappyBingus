# Currency System

This project now uses a shared, multi-currency abstraction so new currencies can be added without
reworking UI, unlockables, or persistence logic. The system keeps the legacy `bustercoins` field for
backward compatibility while treating currencies as the source of truth.

## Key Concepts

### Currency Registry
- **Client:** `public/js/currencySystem.js`
- **Server:** `services/currency.cjs`

Each module exposes a registry that defines currency metadata:

```js
CURRENCY_DEFINITIONS = {
  bustercoin: {
    id: "bustercoin",
    name: "Bustercoin",
    pluralName: "Bustercoins",
    shortLabel: "BC"
  }
}
```

Unknown currency ids are normalized and still receive a usable default definition.

### Wallet / Balances
- **User model:** `currencies` object maps currency ids to integer balances.
- **Legacy compatibility:** `bustercoins` is synced to `currencies.bustercoin`.

Example payload:

```json
{
  "bustercoins": 42,
  "currencies": {
    "bustercoin": 42
  },
  "ownedUnlockables": ["ultradisco"]
}
```

### Currency Helpers

Shared helper behavior across client + server:
- **Normalization** of ids and amounts (`normalizeCurrencyId`, `normalizeCurrencyAmount`).
- **Wallet shaping** (`normalizeCurrencyWallet`) that merges fallback values.
- **Balance lookup** (`getCurrencyBalance`).
- **Debit / credit** operations for transactions (`debitCurrency`, `creditCurrency` on the client).

## Unlockables + Purchases

Purchase unlockables now accept a currency id:

```js
unlock: {
  type: "purchase",
  cost: 45,
  currencyId: "bustercoin"
}
```

If `currencyId` is omitted, the system defaults to `bustercoin`.

## Server Persistence
- `ensureUserSchema` normalizes `currencies` and keeps `bustercoins` in sync.
- `MongoDataStore.recordScore` increments both `bustercoins` and `currencies.bustercoin`.
- `MongoDataStore.purchaseUnlockable` updates:
  - `ownedUnlockables`
  - `ownedIcons` (legacy alias)
  - `currencies`
  - `bustercoins`
  - `unlockables`

## Adding a New Currency

1. Add a definition to the registry in **both** modules:
   - `public/js/currencySystem.js`
   - `services/currency.cjs`
2. Use the new `currencyId` in unlockables or other rewards.
3. Update any UX labels (if you want a custom name/shortLabel in UI).

## Test Coverage

The currency abstraction is covered in:
- `public/js/__tests__/currencySystem.spec.js`
- `services/__tests__/currency.spec.js`

These tests validate normalization, wallet handling, debits/credits, and formatting.
