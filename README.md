# Code Samples

Google Sheets integration →
[sheets.ts](app/sheets.ts)

Unified Transactions Schema →
[transactionSchema.ts](app/transactionSchema.ts)

Experimental Chat v2 → [ReplacementRecommender.ts](lib/ReplacementRecommender.ts)

---

# greengreengreen.green

_green_ is a digital financial calendar for visually managing your finances. Intended to exist in the same category as RocketMoney.

Visit today at https://greengreengreen.green

# Dev setup

Install deps

```sh
pnpm i
```

Run dev

```sh
pnpm dev
```

Run unit tests

```sh
pnpm test
```

# Deployment

Hosted on vercel. `main` is production.

# User flows

Please keep in mind the following user flows when making changes:

- **Onboarding**
    
    - complete tour
    - sign in
    - share sheet

- **Transactions Syncing**

    - edit transactions
    - verify in sheet
    - edit in sheet
    - pull changes in app
    - verify in transactions

- **Chat**

    - select a calendar day with a recurring transaction
    - click chat robot icon
    - respond to chat
    - select a recommendation

